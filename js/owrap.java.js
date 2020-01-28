// OpenWrap v2
// Author: Nuno Aguiar
// Java
 
OpenWrap.java = function() {
	return ow.java;
};

OpenWrap.java.prototype.maven = function() {
    ow.loadObj();
    this.urls = [
        "https://repo1.maven.org/maven2",
        "https://repo.maven.apache.org/maven2"
    ];
};

OpenWrap.java.prototype.maven.prototype._translateArtifact = function(artifactId) {
    return artifactId.replace(/\./g, "/");
};

OpenWrap.java.prototype.maven.prototype._getURL = function() {
    return this.urls[Math.round(Math.random() * (this.urls.length - 1))];
};

/**
 * <odoc>
 * <key>ow.java.maven.search(aTerm) : Array</key>
 * Tries to search aTerm in maven.org and then fallsback to archetype-catalog.xml returning an array with groupId and artifactId.
 * </odoc>
 */
OpenWrap.java.prototype.maven.prototype.search = function(aTerm) {
    plugin("XML");
    ow.loadObj();

    var r = [];
    var res = ow.obj.rest.jsonGet("https://search.maven.org/solrsearch/select?" + ow.obj.rest.writeQuery({ q: aTerm, rows: 999, wt: "json" }));
    if (isDef(res.response.docs) && isArray(res.response.docs)) {
        for(var ii = 0; ii < res.response.docs.length; ii++) {
            r.push({
                groupId: res.response.docs[ii].g,
                artifactId: res.response.docs[ii].a
            });
        }
    }

    if (r.length > 0) return $from(r).sort("groupId").select();

    var xml = new XML(ow.obj.rest.get(this._getURL() + "/archetype-catalog.xml").response).toNativeXML();
    res = eval('xml.archetypes.archetype.(new RegExp(".*" + aTerm + ".*", "i").test(artifactId))');
    for(var ii = 0 ; ii < res.length(); ii++) {
        r.push({
            groupId: res.groupId[ii].toString(),
            artifactId: res.artifactId[ii].toString(),
            description: res.description[ii].toString()
        });
    }

    res = eval('xml.archetypes.archetype.(new RegExp(".*" + aTerm + ".*", "i").test(groupId))');
    for(var ii = 0 ; ii < res.length(); ii++) {
        r.push({
            groupId: res.groupId[ii].toString(),
            artifactId: res.artifactId[ii].toString(),
            description: res.description[ii].toString()
        });
    }

    if (r.length > 0) return $from(r).distinct();

    res = eval('xml.archetypes.archetype.(new RegExp(".*" + aTerm + ".*", "i").test(description))');
    for(var ii = 0 ; ii < res.length(); ii++) {
        r.push({
            groupId: res.groupId[ii].toString(),
            artifactId: res.artifactId[ii].toString(),
            description: res.description[ii].toString()
        });
    }
};

/**
 * <odoc>
 * <key>ow.java.maven.getLatestVersion(aURI) : String</key>
 * Get the latest version from the provide aURI for a Maven 2 repository.
 * </odoc>
 */
OpenWrap.java.prototype.maven.prototype.getLatestVersion = function(aURI) {
    plugin("XML");
    var xml = new XML(ow.obj.rest.get(this._getURL() + "/" + aURI + "/maven-metadata.xml").response);
    var x = xml.toNativeXML();

    var ver = x.versioning.latest.toString();
    if (isUnDef(ver) || ver == "") ver = x.version.toString();

    return ver;
};

/**
 * <odoc>
 * <key>ow.java.maven.getFileVersion(artifactId, aFilenameTemplate, aVersion, aOutputDir)</key>
 * Given the artifactId (prefixed with the group id using ".") will try to download the specific version of the aFilenameTemplate (where
 * version will translate to the latest version) on the provided aOutputDir.\
 * \
 * Example:\
 *    getFile("com.google.code.gson.gson", "gson-{{version}}.jar", "1.2.3", ".")\
 * \
 * </odoc>
 */
OpenWrap.java.prototype.maven.prototype.getFileVersion = function(artifactId, aFilenameTemplate, aVersion, aOutputDir) {
    var aURI = this._translateArtifact(artifactId);
    var version = aVersion;
    var filename = templify(aFilenameTemplate, {
        version: version
    });

    var h = new ow.obj.http(this._getURL() + "/" + aURI + "/" + version + "/" + filename, "GET", "", void 0, true, void 0, true);

    io.mkdir(aOutputDir);
    var rstream = h.responseStream();
    var wstream = io.writeFileStream(aOutputDir + "/" + filename);
    ioStreamCopy(wstream, rstream);
};

OpenWrap.java.prototype.maven.prototype.getDependencies = function(artifactId, aVersion, aOutputDir, aScope, aList, props) {
    loadLodash();
    ow.loadObj();

    var aURI = this._translateArtifact(artifactId);
    var version = (isUnDef(aVersion) ? this.getLatestVersion(aURI) : aVersion);
    var filename = artifactId.substring(artifactId.lastIndexOf(".") + 1) + "-" + version + ".pom";
    var scope = _$(aScope).isString().default("");
    aList = _$(aList).default(new ow.obj.syncArray());
    props = _$(props).isMap().default({});

    var info = new ow.obj.syncArray(), x;
    try {
        var h = $rest({ throwExceptions: false }).get(this._getURL() + "/" + aURI + "/" + version + "/" + filename);
        if (isDef(h.error) && h.error.responseCode == 404) return _.uniqBy(info.toArray(), v => { return v.groupId + "." + v.artifactId; });;

        h = h.replace(/(.*\n)*.*<project( [^>]+)>/, "<project>");
        x = af.fromXML2Obj(h);
    
        if (isDef(x.project.dependencies) && isDef(x.project.dependencies.dependency)) {
            //for(var ii = 0; ii < x.project.dependencies.dependency.length; ii++) {
            parallel4Array(x.project.dependencies.dependency, v => {
                if (isUnDef(v.scope) || (v.scope == scope)) {
                    if (isUnDef(v.optional) || !v.optional) {
                        if (isDef(x.project.properties)) props = merge(props, x.project.properties);

                        var pversion = void 0;
                        if (isDef(v.version)) {
                            var pversion = String(v.version);
                            if (pversion == "${project.version}") pversion = String(x.project.parent.version);
                            if (isDef(pversion) && pversion.startsWith("${")) pversion = String(props[pversion.replace(/^\${(.+)}$/, "$1")]);
                            var pgroupId = String(v.groupId);
                            if (pgroupId == "${project.groupId}") pgroupId = String(x.project.parent.groupId);
                        }

                        if (isDef(pgroupId)) {
                            info.add({
                                groupId: pgroupId,
                                artifactId: String(v.artifactId),
                                version: (isDef(pversion) ? pversion : void 0),
                                scope: (isDef(v.scope) ? String(v.scope) : void 0)
                            });
                            
                            if (aList.indexOf(pgroupId + "." + v.artifactId) < 0) {
                                var rinfo = this.getDependencies(pgroupId + "." + v.artifactId, pversion, void 0, aScope, aList, props);
                                aList.add(pgroupId + "." + v.artifactId);
                                info.addAll(rinfo);
                            }
                        }
                    }
                }
            });
        }
    } catch(e) {
        if (String(e).indexOf("FileNotFoundException") < 0) throw e; 
    }

    return _.uniqBy(info.toArray(), v => { return v.groupId + "." + v.artifactId; });
};

/**
 * <odoc>
 * <key>ow.java.maven.processMavenFile(aFolder, shouldDeleteOld, aLogFunc)</key>
 * Processes a ".maven.yaml" or ".maven.json" on aFolder. Optionally you can specify that is should not delete old versions and/or
 * provide a specific log function (defaults to log). The ".maven.yaml/json" file is expected to contain an artifacts map with an array
 * of maps each with: group (maven artifact group), id (maven id), version (optionally if not the latest), output (optionally specify a different
 * output folder than aFolder), testFunc (optionally a test function to determine which files should be deleted).
 * </odoc>
 */
OpenWrap.java.prototype.maven.prototype.processMavenFile = function(aDirectory, deleteOld, aLogFunc) {
    var arts;
    if (io.fileExists(aDirectory + "/.maven.yaml")) {
        arts = io.readFileYAML(aDirectory + "/.maven.yaml");
    } else {
        if (io.fileExists(aDirectory + "/.maven.json")) {
            arts = io.readFile(aDirectory + "/.maven.json");
        } else {
            throw "no .maven.yaml or .maven.json found at " + aDirectory;
        }
    }
    aLogFunc = _$(aLogFunc).isFunction().default(log);
    deleteOld = _$(deleteOld).isBoolean().default(true);

    if (isDef(arts) && isDef(arts.artifacts)) {
        var maven = new ow.java.maven();
        arts.artifacts.forEach((arts) => {
            var version, hasVersion = false;

            if (isDef(arts.version) && arts != "latest") {
                version = arts.version;
                hasVersion = true;
            } else {
                version = "{{version}}";
                hasVersion = false;
            }

            var testfunc;
            if (isDef(arts.testFunc)) {
                testfunc = new Function(arts.testFunc);
            }

            var outputDir = _$(arts.output).isString().default(aDirectory);
            var filenameTemplate = _$(arts.template).isString().default(arts.id + "-{{version}}.jar");
            if (hasVersion) {
                aLogFunc("Downloading " + arts.id + " version " + version + " jar file...");
                maven.getFileVersion(arts.group + "." + arts.id, filenameTemplate, version, outputDir);
                if (deleteOld) maven.removeOldVersionsSpecific(arts.id, filenameTemplate, version, outputDir, testfunc);
            } else {
                aLogFunc("Downloading latest " + arts.id + " jar file...");
                maven.getFile(arts.group + "." + arts.id, filenameTemplate, outputDir);
                if (deleteOld) maven.removeOldVersions(arts.id, filenameTemplate, outputDir, testfunc);
            }
        });
    }
};

/**
 * <odoc>
 * <key>ow.java.maven.getFile(artifactId, aFilenameTemplate, aOutputDir)</key>
 * Given the artifactId (prefixed with the group id using ".") will try to download the latest version of the aFilenameTemplate (where
 * version will translate to the latest version) on the provided aOutputDir.\
 * \
 * Example:\
 *    getFile("com.google.code.gson.gson", "gson-{{version}}.jar", ".")\
 * \
 * </odoc>
 */
OpenWrap.java.prototype.maven.prototype.getFile = function(artifactId, aFilenameTemplate, aOutputDir) {
    var aURI = this._translateArtifact(artifactId);
    var version = this.getLatestVersion(aURI);
    return this.getFileVersion(artifactId, aFilenameTemplate, version, aOutputDir);
};

/**
 * <odoc>
 * <key>ow.java.maven.removeOldVersions(artifactId, aFilenameTemplate, aVersion, aOutputDir, aFunction)</key>
 * Given the artifactId (prefixed with the group id using ".") will try to delete from aOutputDir all versions that aren't the specific aVersion 
 * of the aFilenameTemplate (where version will translate to the specific version). Optionally you can provide aFunction that receives
 * the canonical filename of each potential version and will only delete it if the function returns true.
 * </odoc>
 */
OpenWrap.java.prototype.maven.prototype.removeOldVersionsSpecific = function(artifactId, aFilenameTemplate, aVersion, aOutputDir, aFunction) {
    var aURI = this._translateArtifact(artifactId);
    var version = aVersion;
    var filename = templify(aFilenameTemplate, {
        version: version
    });
    var filenameT = templify(aFilenameTemplate, {
        version: ".*"
    });    

    if (isUnDef(aFunction)) {
        aFunction = function() { return true; };
    }

    $from(io.listFiles(aOutputDir).files)
    .notEquals("filename", filename)
    .match("filename", filenameT)
    .select((r) => {
        if (aFunction(r.canonicalPath)) io.rm(r.canonicalPath);
    });
};

/**
 * <odoc>
 * <key>ow.java.maven.removeOldVersions(artifactId, aFilenameTemplate, aOutputDir, aFunction)</key>
 * Given the artifactId (prefixed with the group id using ".") will try to delete from aOutputDir all versions that aren't the latest version 
 * of the aFilenameTemplate (where version will translate to the latest version). Optionally you can provide aFunction that receives
 * the canonical filename of each potential version and will only delete it if the function returns true.
 * </odoc>
 */
OpenWrap.java.prototype.maven.prototype.removeOldVersions = function(artifactId, aFilenameTemplate, aOutputDir, aFunction) {
    var aURI = this._translateArtifact(artifactId);
    return this.removeOldVersionsSpecific(artifactId, aFilenameTemplate, this.getLatestVersion(aURI), aOutputDir, aFunction);
};

OpenWrap.java.prototype.cipher = function() {};

/**
 * <odoc>
 * <key>ow.java.cipher.encrypt(aString, aPublicKey) : ArrayBytes</key>
 * Given aPublicKey (from ow.java.cipher.readKey4File or genKeyPair) tries to RSA encrypt aString returning
 * the encrypted ArrayBytes.
 * </odoc>
 */
OpenWrap.java.prototype.cipher.prototype.encrypt = function(plainText, publicKey) {
   _$(plainText).$_("Please provide a string to encrypt.");
   _$(publicKey).$_("Please provide a public key.");

   var cipher = javax.crypto.Cipher.getInstance("RSA/ECB/OAEPWITHSHA-512ANDMGF1PADDING");
   cipher.init(javax.crypto.Cipher.ENCRYPT_MODE, publicKey);
   var cipherText = cipher.doFinal(af.fromString2Bytes(plainText));
   return cipherText;
};

/**
 * <odoc>
 * <key>ow.java.cipher.encryptStream(outputStream, aPublicKey) : Stream</key>
 * Given aPublicKey (from ow.java.cipher.readKey4File or genKeyPair) tries to RSA encrypt outputStream returning
 * an encrypted stream.
 * </odoc>
 */
OpenWrap.java.prototype.cipher.prototype.encryptStream = function(oStream, publicKey) {
   if (oStream == null) throw "Please provide an output stream to encrypt.";
   _$(publicKey).$_("Please provide a public key.");
   var cipher = javax.crypto.Cipher.getInstance("RSA/ECB/OAEPWITHSHA-512ANDMGF1PADDING");
   cipher.init(javax.crypto.Cipher.ENCRYPT_MODE, publicKey);
   return new javax.crypto.CipherOutputStream(oStream, cipher);
};

/**
 * <odoc>
 * <key>ow.java.cipher.encrypt2Text(aString, aPublicKey) : String</key>
 * Given aPublicKey (from ow.java.cipher.readKey4File or genKeyPair) tries to RSA encrypt aString to a base64 string
 * returning the encrypted string.
 * </odoc>
 */
OpenWrap.java.prototype.cipher.prototype.encrypt2Text = function(plainText, publicKey) {
   _$(plainText).$_("Please provide a string to encrypt.");
   _$(publicKey).$_("Please provide a public key.");
   return af.fromBytes2String(af.toBase64Bytes(this.encrypt(plainText, publicKey)));
};

/**
 * <odoc>
 * <key>ow.java.cipher.decrypt4Text(aString, privateKey) : String</key>
 * Given aPrivateKey (from ow.java.cipher.readKey4File or genKeyPair) tries to RSA decrypt a base64 encrypted string
 * returning the decrypted string.
 * </odoc>
 */
OpenWrap.java.prototype.cipher.prototype.decrypt4Text = function(cipherText, privateKey) {
   _$(cipherText).$_("Please provide a string to decrypt.");
   _$(privateKey).$_("Please provide a private key.");
   return this.decrypt(af.fromBase64(af.fromString2Bytes(cipherText)), privateKey);
};

/**
 * <odoc>
 * <key>ow.java.cipher.saveKey2File(aFilename, aKey, isPrivate)</key>
 * Given a public or private aKey (from ow.java.cipher.readKey4File or genKeyPair) tries to save it to aFilename. If
 * the aKey is private isPrivate must be true, if public is must be false.
 * </odoc>
 */
OpenWrap.java.prototype.cipher.prototype.saveKey2File = function(filename, key, isPrivate) {
   _$(filename).isString().$_("Please provide a filename.");
   _$(key).$_("Please provide the key to save.");
   _$(isPrivate).isBoolean().$_("Please indicate if it's a private or public key.");

   var keyFactory = java.security.KeyFactory.getInstance("RSA");
   var spec;
   if (isPrivate) {
      spec = keyFactory.getKeySpec(key, af.getClass("java.security.spec.RSAPrivateKeySpec"));
   } else {
      spec = keyFactory.getKeySpec(key, af.getClass("java.security.spec.RSAPublicKeySpec"));
   }
   var modulus = spec.getModulus();
   var exponent = (isPrivate ? spec.getPrivateExponent() : spec.getPublicExponent() );
   var ostream = new java.io.ObjectOutputStream(new java.io.BufferedOutputStream(new Packages.org.apache.commons.codec.binary.Base64OutputStream(new java.io.FileOutputStream(filename))));
   try {
      ostream.writeObject(modulus);
      ostream.writeObject(exponent);
   } catch(e) {
      sprintErr(e);
   } finally {
      ostream.close();
   }
};

/**
 * <odoc>
 * <key>ow.java.cipher.readKey4File(aFilename, isPrivate) : Key</key>
 * Given a key file previously saved with ow.java.cipher.saveKey2File returns the Key object to use with other functions.
 * If the aKey is private isPrivate must be true, if public is must be false.
 * </odoc>
 */
OpenWrap.java.prototype.cipher.prototype.readKey4File = function(filename, isPrivate) {
   _$(filename).isString().$_("Please provide a filename.");
   _$(isPrivate).isBoolean().$_("Please indicate if it's a private or public key.");

   var istream = new java.io.FileInputStream(filename);
   var oistream = new java.io.ObjectInputStream(new java.io.BufferedInputStream(new Packages.org.apache.commons.codec.binary.Base64InputStream(istream)));
   var key;
   try {
      var modulus = oistream.readObject();
      var exponent = oistream.readObject();
      var keyFactory = java.security.KeyFactory.getInstance("RSA");
      if (!isPrivate) {
         key = keyFactory.generatePublic(new java.security.spec.RSAPublicKeySpec(modulus, exponent));
      } else {
         key = keyFactory.generatePrivate(new java.security.spec.RSAPrivateKeySpec(modulus, exponent));
      }
   } catch(e) {
      sprintErr(e);
   } finally {
      oistream.close();
   }
   return key;
};

/**
 * <odoc>
 * <key>ow.java.cipher.key2encode(aKey) : String</key>
 * Given aKey (from ow.java.cipher.readKey4File or genKeyPair) returns the base 64 corresponding encoded string.
 * </odoc>
 */
OpenWrap.java.prototype.cipher.prototype.key2encode = function(key) {
   _$(key).$_("Please provide a key to encode.");

   return String(java.util.Base64.getEncoder().encodeToString(key.getEncoded()).toString());
};

/**
 * <odoc>
 * <key>ow.java.cipher.msg2encode(anEncryptedMessage) : String</key>
 * Given anEncryptedMessage returns the base 64 encoded string.
 * </odoc>
 */
OpenWrap.java.prototype.cipher.prototype.msg2encode = function(msg) {
   _$(msg).$_("Please provide a message to encode.");
   return String(java.util.Base64.getEncoder().encodeToString(msg));
};
  
/**
 * <odoc>
 * <key>ow.java.cipher.decode2msg(aEncodedMessage) : String</key>
 * Given aEncodedMessage base 64 string returns the original message.
 * </odoc>
 */
OpenWrap.java.prototype.cipher.prototype.decode2msg = function(msg) {
   _$(msg).$_("Please provide a message to decode.");
   return java.util.Base64.getDecoder().decode(af.fromString2Bytes(msg));
};
  
/**
 * <odoc>
 * <key>ow.java.cipher.decode2Key(aKey, isPrivate) : Key</key>
 * Given an encoded base 64 key (with ow.java.cipher.key2encode) returns the corresponding Key object.
 * If the aKey is private isPrivate must be true, if public is must be false.
 * </odoc>
 */
OpenWrap.java.prototype.cipher.prototype.decode2key = function(key, isPrivate) {
   _$(key).$_("Please provide a key to decode.");
   _$(isPrivate).isBoolean().$_("Please indicate if it's a private or public key.");

   var k = java.util.Base64.getDecoder().decode(af.fromString2Bytes(key));
   var keyFactory = java.security.KeyFactory.getInstance("RSA");
   var keySpec;
   if (isPrivate) {
      keySpec = new java.security.spec.PKCS8EncodedKeySpec(k);
      return keyFactory.generatePrivate(keySpec);
   } else {
      keySpec = new java.security.spec.X509EncodedKeySpec(k);
      return keyFactory.generatePublic(keySpec);
   }
};
   
/**
 * <odoc>
 * <key>ow.java.cipher.decrypt(aEncryptedMessage, aPrivateKey) : ArrayBytes</key>
 * Given a previously encrypted message will return the corresponding decrypted message using aPrivateKey.
 * </odoc>
 */
OpenWrap.java.prototype.cipher.prototype.decrypt = function(cipherText, privateKey) {
   _$(cipherText).$_("Please provide an encrypted message to decrypt.");
   _$(privateKey).$_("Please provide a private key.");

   var cipher = javax.crypto.Cipher.getInstance("RSA/ECB/OAEPWITHSHA-512ANDMGF1PADDING");
   cipher.init(javax.crypto.Cipher.DECRYPT_MODE, privateKey);
   var decryptedText = cipher.doFinal(cipherText);
   return af.fromBytes2String(decryptedText);
};

// af.fromInputStream2String(t.decryptStream(af.fromBytes2InputStream(t.encrypt("ola", pub)), priv))
/**
 * <odoc>
 * <key>ow.java.cipher.decryptStream(aInputStream, aPrivateKey) : Stream</key>
 * Given a previously encrypted aInputStream will return the corresponding decrypted stream using aPrivateKey.
 * </odoc>
 */
OpenWrap.java.prototype.cipher.prototype.decryptStream = function(iStream, privateKey) {
   if (iStream == null) throw "Please provide an encrypted stream to decrypt.";
   _$(privateKey).$_("Please provide a private key.");  
   var cipher = javax.crypto.Cipher.getInstance("RSA/ECB/OAEPWITHSHA-512ANDMGF1PADDING");
   cipher.init(javax.crypto.Cipher.DECRYPT_MODE, privateKey);
   return new javax.crypto.CipherInputStream(iStream, cipher);
};

/**
 * <odoc>
 * <key>ow.java.cipher.genKeyPair(aKeySize, aAlg) : Map</key>
 * Given aKeySize (e.g. 2048, 3072, 4096, 7680 and 15360) will return a map with publicKey and privateKey.
 * Optionally you can choose an anAlgorithm (defaults to RSA).
 * </odoc>
 */
OpenWrap.java.prototype.cipher.prototype.genKeyPair = function(size, alg) {
   alg  = _$(alg).default("RSA");
   size = _$(size).default(2048);
   var keyPairGen = java.security.KeyPairGenerator.getInstance(alg);
   keyPairGen.initialize(size);

   var keyPair = keyPairGen.generateKeyPair();
   return {
      publicKey: keyPair.getPublic(),
      privateKey: keyPair.getPrivate()
   };
};

/**
 * <odoc>
 * <key>ow.java.cipher.sign(aPrivateKey, aInputStream, inBytes) : Object</key>
 * Tries to sign the contents from aInputStream using aPrivateKey. Return the signature in an array of bytes or, if inBytes = true,
 * has a base 64 encoded string.
 * </odoc>
 */
OpenWrap.java.prototype.cipher.prototype.sign = function(aPrivateKey, aInputStream, inBytes) {
    var dsa = java.security.Signature.getInstance("SHA256With" + aPrivateKey.getAlgorithm()); 
    dsa.initSign(aPrivateKey);
    ioStreamReadBytes(aInputStream, function(buf) {
        dsa.update(buf, 0, buf.length);
    });
    var res = dsa.sign();
    if (inBytes) {
        return res;
    } else {
        return this.msg2encode(res);
    }
};

/**
 * <odoc>
 * <key>ow.java.cipher.verify(signatureToVerify, aPublicKey, aInputStream, isBytes) : boolean</key>
 * Given aInputStream and aPublicKey will verify if the signatureToVerify is valid. Optionally isBytes = true 
 * the signatureToVerify is an array of bytes instead of base 64 encoded.
 * </odoc>
 */
OpenWrap.java.prototype.cipher.prototype.verify = function(sigToVerify, aPublicKey, aInputStream, isBytes) {
    if (!isBytes) {
        sigToVerify = this.decode2msg(sigToVerify);
    }
    var sig = java.security.Signature.getInstance("SHA256With" + aPublicKey.getAlgorithm());
    sig.initVerify(aPublicKey);
    ioStreamReadBytes(aInputStream, function(buf) {
        sig.update(buf, 0, buf.length);
    });
    return sig.verify(sigToVerify);
};

/**
 * <odoc>
 * <key>ow.java.cipher.genCert(aDn, aPublicKey, aPrivateKey, aValidity, aSigAlgName, aKeyStore, aPassword) : JavaSignature</key>
 * Generates a certificate with aDn (defaults to "cn=openaf"), using aPublicKey and aPrivateKey, for aValidity date (defaults to a date 
 * one year from now). Optionally you can specify aSigAlgName (defaults to SHA256withRSA), a file based aKeyStore and the corresponding
 * aPassword (defaults to "changeit").
 * </odoc>
 */
OpenWrap.java.prototype.cipher.prototype.genCert = function(aDn, aPubKey, aPrivKey, aValidity, aSigAlgName, aKeyStore, aPassword) {
    aDn = _$(aDn, "dn").regexp(/^cn\=/i).isString().default("cn=openaf");
    aSigAlgName = _$(aSigAlgName, "signature alg name").isString().default("SHA256withRSA");
    _$(aPubKey, "public key").$_();
    _$(aPrivKey, "private key").$_();
    aValidity = _$(aValidity, "validity").isDate().default(new Date(now() + (1000 * 60 * 60 * 24 * 365)));

    var info = new Packages.sun.security.x509.X509CertInfo();

    var from = new Date();
    var to = new Date(aValidity);
    
    var interval = new Packages.sun.security.x509.CertificateValidity(from, to);
    var serialNumber = new java.math.BigInteger(64, new java.security.SecureRandom());
    
    var owner = new Packages.sun.security.x509.X500Name(aDn);
    var sigAlgId = new Packages.sun.security.x509.AlgorithmId(Packages.sun.security.x509.AlgorithmId.md5WithRSAEncryption_oid);

    info.set(Packages.sun.security.x509.X509CertInfo.VALIDITY, interval);
    info.set(Packages.sun.security.x509.X509CertInfo.SERIAL_NUMBER, new Packages.sun.security.x509.CertificateSerialNumber(serialNumber));
    info.set(Packages.sun.security.x509.X509CertInfo.SUBJECT, owner);
    info.set(Packages.sun.security.x509.X509CertInfo.ISSUER, owner);
    info.set(Packages.sun.security.x509.X509CertInfo.KEY, new Packages.sun.security.x509.CertificateX509Key(aPubKey));
    info.set(Packages.sun.security.x509.X509CertInfo.VERSION, new Packages.sun.security.x509.CertificateVersion(Packages.sun.security.x509.CertificateVersion.V3));
    info.set(Packages.sun.security.x509.X509CertInfo.ALGORITHM_ID, new Packages.sun.security.x509.CertificateAlgorithmId(sigAlgId));

    var certificate = new Packages.sun.security.x509.X509CertImpl(info);
    certificate.sign(aPrivKey, aSigAlgName);

    sigAlgId = certificate.get(Packages.sun.security.x509.X509CertImpl.SIG_ALG);
    info.set(Packages.sun.security.x509.CertificateAlgorithmId.NAME + "." + Packages.sun.security.x509.CertificateAlgorithmId.ALGORITHM, sigAlgId);
    certificate = new Packages.sun.security.x509.X509CertImpl(info);
    certificate.sign(aPrivKey, aSigAlgName);

    if (isDef(aKeyStore)) {
        aPassword = _$(aPassword).isString().default("changeit");

        var ks = java.security.KeyStore.getInstance(java.security.KeyStore.getDefaultType());
        ks.load(null, null);    
        ks.setKeyEntry("main", aPrivKey, (new java.lang.String(aPassword)).toCharArray(), [ certificate ]);
        var fos = io.writeFileStream(aKeyStore);
        ks.store(fos, (new java.lang.String(aPassword)).toCharArray());
        fos.close();
    }

    return certificate;
};

/**
 * <odoc>
 * <key>ow.java.getMemory(shouldFormat) : Map</key>
 * Returns a map with the current java runtime max, total, used and free heap memory. If shouldFormat = true ow.format.toBytesAbbreviation will be used.
 * </odoc>
 */
OpenWrap.java.prototype.getMemory = function(shouldFormat) {
	var vals = {
		m: Number(java.lang.Runtime.getRuntime().maxMemory()),
        t: Number(java.lang.Runtime.getRuntime().totalMemory()),
        f: Number(java.lang.Runtime.getRuntime().freeMemory())
	};
	vals.u = vals.t - vals.f;

	if (shouldFormat) {
        ow.loadFormat();
		return {
			max: ow.format.toBytesAbbreviation(vals.m),
			total: ow.format.toBytesAbbreviation(vals.t),
			used: ow.format.toBytesAbbreviation(vals.u),
			free: ow.format.toBytesAbbreviation(vals.f)
		};
	} else {
		return {
			max: vals.m,
			total: vals.t,
			used: vals.u,
			free: vals.f
		};
	}
};

/**
 * <odoc>
 * <key>ow.java.gc()</key>
 * Executes the Java runtime gargabe collector.
 * </odoc>
 */
OpenWrap.java.prototype.gc = function() {
    return java.lang.Runtime.getRuntime().gc();
};

/**
 * <odoc>
 * <key>ow.java.getAddressType(aAddress) : Map</key>
 * Given aAddress tries to return a map with the following flags: isValidAddress, hostname, ipv4, ipv6 and privateAddress
 * </odoc>
 */
OpenWrap.java.prototype.getAddressType = function(aTxt) {
    var res ={
        isValidAddress: true,
        hostname: true,
        ipv4: false,
        ipv6: false,
        privateAddress: false
    };
 
    try {
       if (aTxt.trim().match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
          res.ipv4 = true;
          res.hostname = false;

          var addr = java.net.InetAddress.getByName(aTxt);
          if (addr.isSiteLocalAddress() || addr.isLoopbackAddress()) {
             res.privateAddress = true;
          }
       }
 
       if (aTxt.trim().match(/(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))/)) {
          res.ipv6 = true;
          res.hostname = false;

          var addr = java.net.InetAddress.getByName(aTxt);
          if (addr.isSiteLocalAddress() || addr.isLoopbackAddress()) {
             res.privateAddress = true;
          }
       }
    } catch (e) {
       res.isValidAddress = false;
       res.hostname = false;
    }
 
    return res;
};

/**
 * <odoc>
 * <key>ow.java.getHost2IP(aHost) : String</key>
 * Tries to resolve aHost to an IP address using the default DNS.
 * </odoc>
 */
OpenWrap.java.prototype.getHost2IP = function(aName) {
    return String(java.net.InetAddress.getByName(aName).getHostAddress());
};

/**
 * <odoc>
 * <key>ow.java.getIP2Host(aIP) : String</key>
 * Tries to reverse DNS aIP to a host address using the default DNS.
 * </odoc>
 */
OpenWrap.java.prototype.getIP2Host = function(aIP) {
    return String(java.net.InetAddress.getByName(aIP).getCanonicalHostName());
};

/**
 * <odoc>
 * <key>ow.java.getWhoIs(aQuery, aInitServer) : Map</key>
 * Tries to perform a whois aQuery for a domain or an ip address. Optionally you can provide aInitServer (defaults to whois.iana.org)
 * </odoc>
 */
OpenWrap.java.prototype.getWhoIs = function(aQuery, server) {
    var ws = new Packages.org.apache.commons.net.whois.WhoisClient();
    server = _$(server).isString().default("whois.iana.org");

    ws.connect(server);
    var res = ws.query(aQuery);
    ws.disconnect();

    var result = {},
    prefix = "",
    suffix = "";
    end = false;

    String(res).split(/\r?\n/).forEach(v => {
        if (!v.match(/^\s*%/) && v.match(/^\s*[^:]+:\s+.+/)) {
            var capture = true,
            preend = false;
            var ar = v.match(/^\s*([^\:]+)\:\s*(.+)$/);
            var key = String(ar[1]),
            value = String(ar[2]);

            value = value.trim().replace(/\n+\s*$/, "");
            key = key.trim();

            if (key == "nserver" || key == "whois" || key == "status" || key == "created" || key == "changed" || key == "source") {
                prefix = "";
                suffix = "";
            }
            if (key == "domain") {
                prefix = "domain ";
                suffix = "";
            }
            if (key == "contact") {
                prefix = value + " ";
                suffix = "";
                capture = false;
            }
            if (key == "remarks") capture = false;
            if (key.indexOf(">>>") >= 0 && value.indexOf("<<<") >= 0) {
                key = key.replace(/>>>\s*/, "");
                value = value.replace(/\s*<<</, "");
                preend = true;
            }

            if (capture && !end) {
                if (isDef(result[prefix + key + suffix])) value = result[prefix + key + suffix] + "\n" + value;
                    result[prefix + key + suffix] = value;
            }

            if (preend) end = true;
        }
    });

    if (isDef(result.whois) && result.whois != server) result = ow.java.getWhoIs(aQuery, result.whois);

    return result;
};

/**
 * <odoc>
 * <key>ow.java.setIgnoreSSLDomains(aList, aPassword)</key>
 * Replaces the current Java SSL socket factory with a version with a custom trust manager that will "ignore" verification
 * of SSL certificates whose domains are part of aList. Optionally aPassword for the key store can be forced.
 * WARNING: this should only be used in advanced setups where you know what are doing since it DISABLES IMPORTANT SECURITY
 * FEATURES.
 * </odoc>
 */
OpenWrap.java.prototype.setIgnoreSSLDomains = function(aList, aPassword) {
    _$(aList, "list").isArray().$_();

    if (!isNull(java.lang.System.getProperty("javax.net.ssl.trustStorePassword")))
        aPassword = String(java.lang.System.getProperty("javax.net.ssl.trustStorePassword"));

    aPassword = _$(aPassword, "password").isString().default("changeit");

    ow.loadFormat();
    var javaHome = ow.format.getJavaHome(), file;

    if (isNull(java.lang.System.getProperty("javax.net.ssl.trustStore"))) {
        file = "jssecacerts";
        if (!io.fileExists(file)) {
            var sep = String.fromCharCode(java.io.File.separatorChar);
            var dir = String(javaHome + sep + "lib" + sep + "security");
            file = dir + "/jssecacerts";
            if (!io.fileExists(file)) file = dir + "/cacerts";
        }
    } else {
        file = String(java.lang.System.getProperty("javax.net.ssl.trustStore"));
    }

    var tmf = javax.net.ssl.TrustManagerFactory.getInstance(javax.net.ssl.TrustManagerFactory.getDefaultAlgorithm());
    var ks = java.security.KeyStore.getInstance(java.security.KeyStore.getDefaultType());
    ks.load(new java.io.FileInputStream(new java.io.File(file)), (new java.lang.String("changeit")).toCharArray());
    tmf.init(ks);
    var tmf0 = tmf.getTrustManagers()[0];
    var ctx = javax.net.ssl.SSLContext.getInstance("SSL");

    ctx.init(null, [new JavaAdapter(javax.net.ssl.X509TrustManager, {
        __noError: false,
        checkClientTrusted: function(certs, authType) {
          //print("check client trusted");
          tmf0.checkClientTrusted(certs, authType);
        },
        checkServerTrusted: function(certs, authType) {
          //print("check server trusted");
          //print(certs[0].getSubjectDN().getCommonName());
          for(var ii = 0; ii < aList.length; ii++) {
              if (String(certs[0].getSubjectDN().getCommonName()).endsWith(aList[ii])) {
                  this.__noError = true;
              } else {
                  this.__noError = false;
              }
          }

          try {
             tmf0.checkServerTrusted(certs, authType);
          } catch(e) {
             if (!this.__noError) throw e;
          }
        },
        getAcceptedIssuers: function() {
          //print("accept issuer");
          return tmf0.getAcceptedIssuers();
        }
      })], new java.security.SecureRandom());
      
    javax.net.ssl.SSLContext.setDefault(ctx);
    javax.net.ssl.HttpsURLConnection.setDefaultSSLSocketFactory(ctx.getSocketFactory());
};