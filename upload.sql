CREATE TABLE `configuration` (
  `idconfiguration` int(11) NOT NULL AUTO_INCREMENT,
  `fileName` varchar(300) NOT NULL,
  `importantColumns` varchar(300) DEFAULT NULL,
  `creationDate` datetime NOT NULL,
  `headerRowNumber` int(11) NOT NULL,
  `tableName` varchar(300) NOT NULL,
  `title` varchar(500) DEFAULT NULL,
  `owner` varchar(300) NOT NULL,
  `isCurrent` tinyint(1) NOT NULL DEFAULT '0',
  `modificationDate` datetime DEFAULT NULL,
  PRIMARY KEY (`idconfiguration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DELIMITER $$
CREATE TRIGGER configuration_created BEFORE INSERT ON configuration
FOR EACH ROW 
BEGIN
	SET new.creationDate := now();
	SET new.modificationDate := now();
END;$$
DELIMITER ;

DELIMITER $$
CREATE TRIGGER configuration_updated BEFORE UPDATE ON configuration
FOR EACH ROW 
BEGIN
	SET new.modificationDate := now();
END;$$
DELIMITER ;

CREATE TABLE `itemplus` (
  `idItemplus` int(11) NOT NULL AUTO_INCREMENT,
  `creationDate` datetime NOT NULL,
  `modificationDate` datetime NOT NULL,
  `itemRow` int(11) DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `value` varchar(1000) NOT NULL,
  `item` longtext,
  `active` int(1) DEFAULT NULL,
  `author` varchar(100) DEFAULT NULL,
  `tableName` varchar(100) NOT NULL,
  `fileName` varchar(100) NOT NULL,
  PRIMARY KEY (`idItemplus`,`value`),
  UNIQUE KEY `iditemplus_UNIQUE` (`idItemplus`),
  KEY `idItem` (`itemRow`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DELIMITER $$
CREATE TRIGGER itemplus_created BEFORE INSERT ON itemplus
FOR EACH ROW 
BEGIN
	SET new.creationDate := now();
	SET new.modificationDate := now();
END;$$
DELIMITER ;

DELIMITER $$
CREATE TRIGGER itemplus_updated BEFORE UPDATE ON itemplus
FOR EACH ROW 
BEGIN
	SET new.modificationDate := now();
END;$$
DELIMITER ;