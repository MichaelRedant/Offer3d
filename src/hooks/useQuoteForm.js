import { useState } from 'react';

export default function useQuoteForm() {
  const [clientId, setClientId] = useState(null);
  const [newClientData, setNewClientData] = useState({});
  const [deliveryOption, setDeliveryOption] = useState('');
  const [printItems, setPrintItems] = useState([]); // altijd een array!
  const [designHours, setDesignHours] = useState(0);
  const [elektriciteitsprijs, setElektriciteitsprijs] = useState(0.12);

  return {
    clientId,
    setClientId,
    newClientData,
    setNewClientData,
    deliveryOption,
    setDeliveryOption,
    lineItems: printItems, // alias voor duidelijkheid
    setLineItems: setPrintItems,
    designHours,
    setDesignHours,
    elektriciteitsprijs,
    setElektriciteitsprijs
  };
}
