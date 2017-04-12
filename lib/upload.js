const Client = require('ftp');
const fs = require('fs');
const S = require('string');
const Config = require('./configuration.js');
const ssh2Client = require('ssh2-sftp-client');



module.exports = {
	ftp : (conf, file , isSSL, cb) => {
		Config.ReadConfig(conf, (err, configObj) => {
			if(err){
				console.log('[upload.js] Read config file failed.');
				if(cb){
					cb(err,'Read config file failed.');
				}
			}else{
				var c = new Client();
				var fname = (S(file).splitLeft('/'))[(S(file).splitLeft('/')).length-1];

				var ftpsite    = configObj["ftpsite"];
				var username   = configObj["username"];
				var password   = configObj["password"];
				var vport      = configObj["vport"];
				var upload_path= configObj["upload_path"];

				var options = {};
				var ftpname = "FTP";

				if(isSSL){
					ftpname = "FTPS";
					options = {
						host    :   ftpsite,
						port    :   vport,
						user    :   username,
						password:   password,
						secure  :   true,
						pasvTimeout: 20000,
						keepalive: 20000,
						secureOptions : {
							rejectUnauthorized: false
						}
					}
				}else{
					options = {
						host    :   ftpsite,
						port    :   vport,
						user    :   username,
						password:   password
					}
				}

				c.on('ready', () => {
					console.log(upload_path + '/' + fname);
					c.put(file, upload_path + '/' + fname, (err) => {
						if(err){
							console.log(err);
							if(cb){
								cb(err,'[upload.js] Upload file failed.');
							}
						}else{
							console.log("Upload file \"" + fname + "\" to " + ftpname + " \"" + ftpsite + "\" path: \"" + upload_path +"\"" );
							if(cb){
								c.end();
								return cb(null,"File " + fname + " upload to " + ftpname + " \"" + ftpsite+ "\"");
							}
						}


					});
				});
				c.connect(options);	
			}
		});
	},

	sftp : (conf, file, cb) => {
		const sClient = new ssh2Client();
		Config.ReadConfig(conf, (err,configObj) => {
			if(err){
				console.log('[upload.js] Read SFTP config file failed.');
				if(cb){
					cb(err,'Read config file failed.');
				}
			}else{
				var ulf = S(file).splitLeft('/')[(S(file).splitLeft('/')).length-1];
				var isExist = false;

				var sftpsite   = configObj["sftpsite"];
				var username   = configObj["username"];
				var password   = configObj["password"];
				var vport      = configObj["vport"];
				var upload_path = configObj["upload_path"];
				
				var options = {
					host    :   sftpsite,
					port    :   vport,
					user    :   username,
					password:   password,
				}

				var rfOption = {
					flags: 'r',
					encoding: null,
					fd: null,
					mode: 0o666,
					autoClose: true
				}

				console.log(options);
				sClient.connect(options).then(()=>{
					return sClient.list(upload_path);
				}).then((data) => {
					console.log(data);
					for(var i=0 ; i < data.length; i++){
						if(data[i]['type'] == '-' && data[i]['name'] == ulf){
							isExist = true;
						}
					}
					if(!isExist){
						console.log("[upload.js] Upload file.....");
						sClient.connect(options).then(() => {
							return sClient.put(file,upload_path + ulf , rfOption);
						}).then((data) => {
							//console.log(data);
							if(cb){
								sClient.end();
								return cb(null,"[upload.js] Upload file : \"" + upload_path + ulf + "\" successfully.");
							}
						}).catch((err) => {
							console.log(err);
							if(cb){
								sClient.end();
								return cb(err,"[upload.js] Upload failed.");
							}
						});
					}else{
						if(cb){
							sClient.end();
							return cb(null,"[upload.js] File already existed. End the upload stage.");
						}
					}

				}).catch((err) => {
					if(cb){
						sClient.end();
						return cb(err,"[upload.js] Read SFTP list failed")
					}
				});
			}
		});
	}
	
}

/*
SFTP("./config/MG163_usftp.json", "./WistronMG163_031317.csv", (err,msg)=>{
	if(err){
		console.log(err);
	}else{
		console.log(msg);
	}
});*/