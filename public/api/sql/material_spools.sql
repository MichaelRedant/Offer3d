-- Rolvoorraad voor filamenten (material_spools)
-- Voer dit script eenmaal uit in de Offr3d database.

CREATE TABLE IF NOT EXISTS material_spools (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  material_id INT UNSIGNED NOT NULL,
  label VARCHAR(128) NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'sealed', -- sealed | open | reserve | empty
  locatie VARCHAR(120) DEFAULT NULL,
  gewicht_netto_gram INT UNSIGNED NOT NULL DEFAULT 0, -- Netto materiaal op volle rol
  gewicht_rest_gram INT UNSIGNED DEFAULT NULL, -- Resterend materiaal (laat NULL = zelfde als netto)
  batch_code VARCHAR(120) DEFAULT NULL,
  aankoop_datum DATE DEFAULT NULL,
  notities TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_material_spools_material FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_material_spools_material ON material_spools (material_id);
CREATE INDEX idx_material_spools_status ON material_spools (status);
