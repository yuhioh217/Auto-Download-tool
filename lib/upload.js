const Client = require('ftp');
const fs = require('fs');
const S = require('string');
const Config = require('./configuration.js');
const ssh2Client = require('ssh2-sftp-client');


const ftp_upload = (conf, file , isSSL) => {
		
	return new Promise(async(resolve, reject)=>{
		
		var configObj = {};
		try{
			configObj = await Config.ReadConfig(conf);
		}catch(e){
			console.log('[upload.js] Read config file failed.');
			console.log(e);
			reject(e);
		}

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
					console.log('[upload.js] Upload file failed.');					
					reject(err);
					
				}else{
					console.log("Upload file \"" + fname + "\" to " + ftpname + " \"" + ftpsite + "\" path: \"" + upload_path +"\"" );				
					c.end();
					resolve("File " + fname + " upload to " + ftpname + " \"" + ftpsite+ "\"");						
				}
			});
		});
		c.connect(options);
	});

}



const sftp_upload = (conf, file) => {

	return new Promise(async(resolve, reject) => {
		const sClient = new ssh2Client();
		var configObj = {};
		try{
			configObj = await Config.ReadConfig(conf);
		}catch(e){
			console.log('[upload.js] Read SFTP config file failed.');
			console.log(e);
			reject(e);
		}

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

		//console.log(options);
		sClient.connect(options).then(()=>{
			return sClient.list(upload_path);
		}).then((data) => {
			//console.log(data);
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
					sClient.end();
					resolve("[upload.js] Upload file : \"" + upload_path + ulf + "\" successfully.");
					
				}).catch((err) => {
					console.log(err);
					
					sClient.end();
					console.log("[upload.js] Upload failed.");
					reject(err);
				
				});
			}else{
				
				sClient.end();
				resolve("[upload.js] File already existed. End the upload stage.");
				
			}

		}).catch((err) => {
			
			sClient.end();
			console.log("[upload.js] Read SFTP list failed")
			reject(err);
			
		});
	});
}


module.exports = {
	ftp : async(conf, file , isSSL) => {
		try{
			console.log('Upload to FTP...');
			var data = await ftp_upload(conf, file, isSSL);
			return data;
		}catch(e){
			console.log(e);
			return;
		}
	},

	sftp : async(conf, file) => {
		try{
			console.log('Upload to SFTP...');
			var data = await sftp_upload(conf, file);
			return data;
		}catch(e){
			console.log(e);
			return;
		}
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