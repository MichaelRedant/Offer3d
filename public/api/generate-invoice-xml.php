<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/invoice-utils.php';

$invoiceId = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($invoiceId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Geen geldig factuur ID.']);
    exit;
}

function amount($value, int $decimals = 2): string {
    return number_format((float)$value, $decimals, '.', '');
}

try {
    ensureInvoiceTables($pdo);
    ensureSettingsExtendedColumns($pdo);

    $invoice = fetchInvoice($pdo, $invoiceId);
    if (!$invoice) {
        http_response_code(404);
        echo json_encode(['error' => 'Factuur niet gevonden.']);
        exit;
    }

    $settingsRow = $pdo->query("SELECT * FROM settings WHERE id = 1")->fetch(PDO::FETCH_ASSOC) ?: [];
    $supplier = $invoice['supplier_snapshot'] ?: [
        'name' => $settingsRow['company_name'] ?? '',
        'vatNumber' => $settingsRow['vat_number'] ?? '',
        'street' => $settingsRow['company_street'] ?? '',
        'postalCode' => $settingsRow['company_postal_code'] ?? '',
        'city' => $settingsRow['company_city'] ?? '',
        'countryCode' => $settingsRow['company_country_code'] ?? 'BE',
        'iban' => $settingsRow['iban'] ?? '',
        'bic' => $settingsRow['bic'] ?? '',
        'peppolEndpointId' => $settingsRow['peppol_endpoint_id'] ?? '',
        'peppolScheme' => $settingsRow['peppol_scheme'] ?? '',
        'email' => $settingsRow['company_email'] ?? '',
        'phone' => $settingsRow['company_phone'] ?? '',
    ];
    $customer = $invoice['customer_snapshot'] ?: null;
    if (!$customer) {
        $clientStmt = $pdo->prepare("SELECT * FROM clients WHERE id = ? LIMIT 1");
        $clientStmt->execute([$invoice['client_id']]);
        $customer = $clientStmt->fetch(PDO::FETCH_ASSOC) ?: [];
    }

    $requiredSupplier = ['name','vatNumber','street','postalCode','city','countryCode','peppolEndpointId','iban'];
    $missing = [];
    foreach ($requiredSupplier as $field) {
        if (empty($supplier[$field])) {
            $missing[] = $field;
        }
    }
    if ($missing) {
        http_response_code(422);
        echo json_encode(['error' => 'Ontbrekende bedrijfsgegevens voor UBL: ' . implode(', ', $missing)]);
        exit;
    }

    $requiredCustomer = ['street','postalCode','city','countryCode'];
    $missingCustomer = [];
    foreach ($requiredCustomer as $field) {
        if (empty($customer[$field])) {
            $missingCustomer[] = $field;
        }
    }
    if ($missingCustomer) {
        http_response_code(422);
        echo json_encode(['error' => 'Ontbrekende klantgegevens voor UBL: ' . implode(', ', $missingCustomer)]);
        exit;
    }

    $buyerReference = $invoice['buyer_reference'] ?: ($invoice['payment_reference'] ?? $invoice['invoice_number']);
    $vatExempt = !empty($invoice['vat_exempt']);
    $vatExemptReason = $invoice['vat_exempt_reason'] ?? '';

    $doc = new DOMDocument('1.0', 'UTF-8');
    $doc->formatOutput = true;

    $nsInvoice = 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2';
    $nsCac = 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2';
    $nsCbc = 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2';

    $root = $doc->createElementNS($nsInvoice, 'Invoice');
    $root->setAttribute('xmlns:cac', $nsCac);
    $root->setAttribute('xmlns:cbc', $nsCbc);
    $doc->appendChild($root);

    $addCbc = function($name, $value) use ($doc, $root, $nsCbc) {
        $el = $doc->createElementNS($nsCbc, 'cbc:' . $name, $value);
        $root->appendChild($el);
        return $el;
    };

    $addCbc('CustomizationID', 'urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0');
    $addCbc('ProfileID', 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0');
    $addCbc('ID', $invoice['invoice_number']);
    $addCbc('IssueDate', $invoice['issue_date']);
    if (!empty($invoice['due_date'])) {
        $addCbc('DueDate', $invoice['due_date']);
    }
    $addCbc('InvoiceTypeCode', '380');
    $addCbc('DocumentCurrencyCode', $invoice['currency_code'] ?? 'EUR');
    if ($buyerReference) {
        $addCbc('BuyerReference', $buyerReference);
    }

    $addParty = function($parentName, $partyData) use ($doc, $root, $nsCac, $nsCbc) {
        $partyRoot = $doc->createElementNS($nsCac, 'cac:' . $parentName);
        $root->appendChild($partyRoot);
        $party = $doc->createElementNS($nsCac, 'cac:Party');
        $partyRoot->appendChild($party);

        if (!empty($partyData['peppolEndpointId'])) {
            $endpoint = $doc->createElementNS($nsCbc, 'cbc:EndpointID', $partyData['peppolEndpointId']);
            if (!empty($partyData['peppolScheme'])) {
                $endpoint->setAttribute('schemeID', $partyData['peppolScheme']);
            }
            $party->appendChild($endpoint);
        }

        $nameEl = $doc->createElementNS($nsCac, 'cac:PartyName');
        $nameEl->appendChild($doc->createElementNS($nsCbc, 'cbc:Name', $partyData['name'] ?? ''));
        $party->appendChild($nameEl);

        $address = $doc->createElementNS($nsCac, 'cac:PostalAddress');
        $address->appendChild($doc->createElementNS($nsCbc, 'cbc:StreetName', $partyData['street'] ?? ''));
        $address->appendChild($doc->createElementNS($nsCbc, 'cbc:CityName', $partyData['city'] ?? ''));
        $address->appendChild($doc->createElementNS($nsCbc, 'cbc:PostalZone', $partyData['postalCode'] ?? ''));
        $country = $doc->createElementNS($nsCac, 'cac:Country');
        $country->appendChild($doc->createElementNS($nsCbc, 'cbc:IdentificationCode', $partyData['countryCode'] ?? ''));
        $address->appendChild($country);
        $party->appendChild($address);

        if (!empty($partyData['vatNumber'])) {
            $tax = $doc->createElementNS($nsCac, 'cac:PartyTaxScheme');
            $companyId = $doc->createElementNS($nsCbc, 'cbc:CompanyID', $partyData['vatNumber']);
            $companyId->setAttribute('schemeID', 'VAT');
            $tax->appendChild($companyId);
            $taxScheme = $doc->createElementNS($nsCac, 'cac:TaxScheme');
            $taxScheme->appendChild($doc->createElementNS($nsCbc, 'cbc:ID', 'VAT'));
            $tax->appendChild($taxScheme);
            $party->appendChild($tax);
        }

        $legal = $doc->createElementNS($nsCac, 'cac:PartyLegalEntity');
        $legal->appendChild($doc->createElementNS($nsCbc, 'cbc:RegistrationName', $partyData['name'] ?? ''));
        $party->appendChild($legal);

        return $partyRoot;
    };

    $addParty('AccountingSupplierParty', $supplier);
    $addParty('AccountingCustomerParty', [
        'name' => $customer['name'] ?? $customer['klant_naam'] ?? ($customer['company'] ?? ''),
        'vatNumber' => $customer['vatNumber'] ?? $customer['btw_nummer'] ?? '',
        'street' => $customer['street'] ?? '',
        'city' => $customer['city'] ?? '',
        'postalCode' => $customer['postalCode'] ?? '',
        'countryCode' => $customer['countryCode'] ?? 'BE',
        'peppolEndpointId' => $customer['peppol_endpoint_id'] ?? '',
        'peppolScheme' => $customer['peppol_scheme'] ?? '',
    ]);

    // PaymentMeans
    $paymentMeans = $doc->createElementNS($nsCac, 'cac:PaymentMeans');
    $root->appendChild($paymentMeans);
    $paymentMeans->appendChild($doc->createElementNS($nsCbc, 'cbc:PaymentMeansCode', '31'));
    if (!empty($invoice['payment_reference'])) {
        $paymentMeans->appendChild($doc->createElementNS($nsCbc, 'cbc:PaymentID', $invoice['payment_reference']));
    }
    $account = $doc->createElementNS($nsCac, 'cac:PayeeFinancialAccount');
    $account->appendChild($doc->createElementNS($nsCbc, 'cbc:ID', $supplier['iban']));
    if (!empty($supplier['bic'])) {
        $fi = $doc->createElementNS($nsCac, 'cac:FinancialInstitutionBranch');
        $fiInstitution = $doc->createElementNS($nsCac, 'cac:FinancialInstitution');
        $fiInstitution->appendChild($doc->createElementNS($nsCbc, 'cbc:ID', $supplier['bic']));
        $fi->appendChild($fiInstitution);
        $account->appendChild($fi);
    }
    $paymentMeans->appendChild($account);

    if (!empty($invoice['payment_terms'])) {
        $paymentTerms = $doc->createElementNS($nsCac, 'cac:PaymentTerms');
        $paymentTerms->appendChild($doc->createElementNS($nsCbc, 'cbc:Note', $invoice['payment_terms']));
        $root->appendChild($paymentTerms);
    }

    // Totals
    $taxTotal = $doc->createElementNS($nsCac, 'cac:TaxTotal');
    $taxTotal->appendChild($doc->createElementNS($nsCbc, 'cbc:TaxAmount', amount($invoice['total_vat'] ?? 0)))->setAttribute('currencyID', $invoice['currency_code'] ?? 'EUR');
    $taxSubtotal = $doc->createElementNS($nsCac, 'cac:TaxSubtotal');
    $taxSubtotal->appendChild($doc->createElementNS($nsCbc, 'cbc:TaxableAmount', amount($invoice['total_excl'] ?? 0)))->setAttribute('currencyID', $invoice['currency_code'] ?? 'EUR');
    $taxSubtotal->appendChild($doc->createElementNS($nsCbc, 'cbc:TaxAmount', amount($invoice['total_vat'] ?? 0)))->setAttribute('currencyID', $invoice['currency_code'] ?? 'EUR');
    $taxCategory = $doc->createElementNS($nsCac, 'cac:TaxCategory');
    $taxCategory->appendChild($doc->createElementNS($nsCbc, 'cbc:ID', deriveVatCode((float)($invoice['vat_rate'] ?? 0), $vatExempt)));
    $taxCategory->appendChild($doc->createElementNS($nsCbc, 'cbc:Percent', amount($invoice['vat_rate'] ?? 0, 2)));
    if ($vatExempt && $vatExemptReason) {
        $taxCategory->appendChild($doc->createElementNS($nsCbc, 'cbc:TaxExemptionReason', $vatExemptReason));
    }
    $taxScheme = $doc->createElementNS($nsCac, 'cac:TaxScheme');
    $taxScheme->appendChild($doc->createElementNS($nsCbc, 'cbc:ID', 'VAT'));
    $taxCategory->appendChild($taxScheme);
    $taxSubtotal->appendChild($taxCategory);
    $taxTotal->appendChild($taxSubtotal);
    $root->appendChild($taxTotal);

    $legalTotal = $doc->createElementNS($nsCac, 'cac:LegalMonetaryTotal');
    $lineExtension = $doc->createElementNS($nsCbc, 'cbc:LineExtensionAmount', amount($invoice['total_excl'] ?? 0));
    $lineExtension->setAttribute('currencyID', $invoice['currency_code'] ?? 'EUR');
    $legalTotal->appendChild($lineExtension);
    $taxExclusive = $doc->createElementNS($nsCbc, 'cbc:TaxExclusiveAmount', amount($invoice['total_excl'] ?? 0));
    $taxExclusive->setAttribute('currencyID', $invoice['currency_code'] ?? 'EUR');
    $legalTotal->appendChild($taxExclusive);
    $taxInclusive = $doc->createElementNS($nsCbc, 'cbc:TaxInclusiveAmount', amount($invoice['total_incl'] ?? 0));
    $taxInclusive->setAttribute('currencyID', $invoice['currency_code'] ?? 'EUR');
    $legalTotal->appendChild($taxInclusive);
    $payable = $doc->createElementNS($nsCbc, 'cbc:PayableAmount', amount($invoice['total_incl'] ?? 0));
    $payable->setAttribute('currencyID', $invoice['currency_code'] ?? 'EUR');
    $legalTotal->appendChild($payable);
    $root->appendChild($legalTotal);

    // Lines
    $items = $invoice['items'] ?? [];
    foreach ($items as $index => $item) {
        $line = $doc->createElementNS($nsCac, 'cac:InvoiceLine');
        $root->appendChild($line);
        $line->appendChild($doc->createElementNS($nsCbc, 'cbc:ID', (string)($index + 1)));
        $qty = $doc->createElementNS($nsCbc, 'cbc:InvoicedQuantity', amount($item['quantity'] ?? 1, 4));
        $qty->setAttribute('unitCode', $item['unit_code'] ?? 'C62');
        $line->appendChild($qty);
        $lineAmount = $doc->createElementNS($nsCbc, 'cbc:LineExtensionAmount', amount($item['line_extension_amount'] ?? 0));
        $lineAmount->setAttribute('currencyID', $invoice['currency_code'] ?? 'EUR');
        $line->appendChild($lineAmount);

        $itemNode = $doc->createElementNS($nsCac, 'cac:Item');
        $itemNode->appendChild($doc->createElementNS($nsCbc, 'cbc:Name', $item['description'] ?? 'Item'));
        $taxCat = $doc->createElementNS($nsCac, 'cac:ClassifiedTaxCategory');
        $lineVatRate = $item['vat_rate'] ?? $invoice['vat_rate'] ?? 0;
        $taxCat->appendChild($doc->createElementNS($nsCbc, 'cbc:ID', $item['vat_code'] ?? deriveVatCode((float)$lineVatRate, $vatExempt)));
        $taxCat->appendChild($doc->createElementNS($nsCbc, 'cbc:Percent', amount($lineVatRate, 2)));
        if ($vatExempt && $vatExemptReason) {
            $taxCat->appendChild($doc->createElementNS($nsCbc, 'cbc:TaxExemptionReason', $vatExemptReason));
        }
        $taxSchemeLine = $doc->createElementNS($nsCac, 'cac:TaxScheme');
        $taxSchemeLine->appendChild($doc->createElementNS($nsCbc, 'cbc:ID', 'VAT'));
        $taxCat->appendChild($taxSchemeLine);
        $itemNode->appendChild($taxCat);
        $line->appendChild($itemNode);

        $price = $doc->createElementNS($nsCac, 'cac:Price');
        $priceAmount = $doc->createElementNS($nsCbc, 'cbc:PriceAmount', amount($item['unit_price'] ?? 0, 4));
        $priceAmount->setAttribute('currencyID', $invoice['currency_code'] ?? 'EUR');
        $price->appendChild($priceAmount);
        $line->appendChild($price);
    }

    header('Content-Type: application/xml');
    header('Content-Disposition: attachment; filename="invoice-' . $invoiceId . '.xml"');
    echo $doc->saveXML();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Fout bij genereren UBL: ' . $e->getMessage()]);
}
