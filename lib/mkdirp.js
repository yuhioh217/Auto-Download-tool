'use strict';
const mkdirps = require('mkdirps');
const Client = require('ftp');
const fs = require('fs');
const S = require('string');
const glob = require('glob');
const ssh2Client = require('ssh2-sftp-client');

const ftp_promise = (conf, tag, ssl) => {
	return new Promise(async(resolve, reject)=>{
		var Config = require('./configuration.js');
		var fname = "FTP";
		var configObj = {};
		if(ssl){
			fname = "FTPS";
		}
		try{
			configObj = await Config.ReadConfig(conf);
		}catch(e){
			console.log('[mkdirp.js] ' + fname + ' config load failed. Please check the config file.');
			console.log(e);
			reject(e);
		}

		var ftpsite    = configObj["ftpsite"];
		var username   = configObj["username"];
		var password   = configObj["password"];
		var vport      = configObj["vport"];
		var basic_path = configObj["basic_path"];
		var isExist = false;
		var options = {};

		if(ssl){
			options = {
				host    :   ftpsite,
				port    :   vport,
				user    :   username,
				password:   password,
				secure  :   true,
				pasvTimeout: 50000,
				keepalive: 50000,
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
		
		var c = new Client();
		c.on('ready', () => {
			c.list(basic_path, (err, list) => {
				if (err){					
					c.end();
					console.log("Read list failed");
					reject(err);
				}

				for(var i=0 ; i< list.length ;i++){
					if(list[i]['name'] == tag && list[i]['type'] == 'd'){
						isExist = true;	
					}
				}

				if(!isExist){
					c.mkdir(basic_path + tag, (err) => {
						if(err){
							c.end();
							console.log("Create Failed.");
							reject(err);						
						}
						console.log("[mkdirp.js] Create directory \"" + basic_path + tag + "\" successfully.");
						console.log("[mkdirp.js] End the " + fname + " client");
						c.end();

						console.log("[mkdirp.js] Create successfully.");
						resolve(basic_path+tag);
						
					})
				}else{
					console.log("[mkdirp.js] Directory : " + tag + " already existed in " + fname + " : " + ftpsite + " " + basic_path);

					c.end();
					console.log("[mkdirp.js] Directory already existed");
					resolve(basic_path+tag);
				}		

			});				
		});

		c.connect(options);
	});
}


const sftp_promise = (conf, tag) => {
	return new Promise(async(resolve, reject)=>{
		var sClient = new ssh2Client();
		var Config = require('./configuration.js');

		var configObj = {};

		try{
			configObj = await Config.ReadConfig(conf);
		}catch(e){
			console.log('[download.js] Read SFTP config file failed.');
			console.log(e);
			reject(e);
		}


		console.log(tag);

		var sftpsite   = configObj["sftpsite"];
		var username   = configObj["username"];
		var password   = configObj["password"];
		var vport      = configObj["vport"];
		var basic_path = configObj["basic_path"];
		var options = {
			host    :   sftpsite,
			port    :   vport,
			user    :   username,
			password:   password,
		};

		var isExist = false;

		console.log(options);

		sClient.connect(options).then(() => {
			return sClient.list(basic_path);
		}).then((data) => {
			for(var i=0 ; i < data.length; i++){
				if(data[i]['type'] == 'd' && data[i]['name'] == tag){
					isExist = true;
				}
			}
			if(!isExist){
				console.log("create dir");
				sClient.connect(options).then(() => {
					return sClient.mkdir(basic_path + tag, false);
				}).then((data) => {
					//console.log(data);
					sClient.end();
					console.log("[mkdir.js] Create directory \"" + basic_path + tag + "\" successfully.");
					resolve(basic_path + tag);

				}).catch((err) => {
						
					sClient.end();
					console.log("[mkdir.js] Create failed.");
					console.log(err);				
					reject(err);
					
				});
			}else{
				
				sClient.end();
				console.log("[mkdir.js] Directory already existed. End the create stage.");
				resolve(basic_path + tag);
			
			}
		}).catch((err) => {
			//console.log(err);
			sClient.end();
			console.log("[mkdirp.js] Read SFTP list failed");
			console.log(err);
			reject(err);
			
		});

	});
}




module.exports = {
	ftp : async(conf, tag, ssl) => {
		console.log("[mkdirp.js FTP] Create directory : " + tag);
		var dir = await ftp_promise(conf, tag, ssl).catch(console.log.bind(console));
		console.log("Folder \"" + dir + "\" create successfully.");
		return dir;
	},

	sftp : async(conf, tag) => {
		console.log("[mkdirp.js SFTP] Create directory : " + tag);
		var dir = await sftp_promise(conf, tag).catch(console.log.bind(console));
		console.log("Folder \"" + dir + "\" create successfully.");
		return dir;
	}
	
}



/*** test function
**
	var data = await Upload.ftp("./config/MG163_uftp.json","./file/DarlingTest0523.docx",false);
	console.log('---' + data);

	var dir = await Mkdirp.sftp("./config/MG163_dsftp.json","V7.X.XXX").catch(console.log.bind(console));
	console.log(dir);

***/