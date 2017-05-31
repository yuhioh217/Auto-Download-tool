'use strict';
const mkdirps = require('mkdirps');
const Client = require('ftp');
const fs = require('fs');
const S = require('string');
const glob = require('glob');
const ssh2Client = require('ssh2-sftp-client');

module.exports = {
	ftp : (conf, tag, ssl, cb) => {
		var Config = require('./configuration.js');
		var fname = "FTP";
		if(ssl){
			fname = "FTPS";
		}

		Config.ReadConfig(conf, (err, configObj) => {
			if(err){
				console.log('[mkdirp.js] ' + fname + ' config load failed. Please check the config file.');
				if(cb){
					return cb(err,'Read ' + fname + ' Config file failed', null);
				}
			}else{
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
							if(cb){
								c.end();
								return cb(err,"Read list failed", null);
							}
						}

						for(var i=0 ; i< list.length ;i++){
							if(list[i]['name'] == tag && list[i]['type'] == 'd'){
								isExist = true;	
							}
						}

						if(!isExist){
							c.mkdir(basic_path + tag, (err) => {
								if(err){
									if(cb){
										c.end();
										return cb(err,"Create Failed.",null);
									}
								}
								console.log("[mkdirp.js] Create directory \"" + basic_path + tag + "\" successfully.");
								console.log("[mkdirp.js] End the " + fname + " client");
								c.end();

								if(cb){
									c.end();
									return cb(null,"Create successfully.", basic_path+tag );
								}
							})
						}else{
							console.log("[mkdirp.js] Directory : " + tag + " already existed in " + fname + " : " + ftpsite + " " + basic_path);
							if(cb){
								c.end();
								return cb(null,"Directory already existed",null);
							}
						}		

					});				
				});

				c.connect(options);


			}
		});
	},

	sftp : (conf, tag, cb) => {
		var sClient = new ssh2Client();
		var Config = require('./configuration.js');
		Config.ReadConfig(conf, (err,configObj) => {
			if(err){
				console.log('[download.js] Read SFTP config file failed.');
				if(cb){
					return cb(err,"Read SFTP config file failed.", null);
				}
			}else{
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
							if(cb){
								sClient.end();
								return cb(null,"[mkdir.js] Create directory \"" + basic_path + tag + "\" successfully.", basic_path + tag);
							}
						}).catch((err) => {
							console.log(err);
							if(cb){
								sClient.end();
								return cb(err,"[mkdir.js] Create failed.",null);
							}
						});
					}else{
						if(cb){
							sClient.end();
							return cb(null,"[mkdir.js] Directory already existed. End the create stage.", null);
						}
					}
				}).catch((err) => {
					//console.log(err);
					if(cb){
						sClient.end();
						return cb(err,"[mkdirp.js] Read SFTP list failed", null);
					}
				});
			}
		});
		
	}
	
}



/*** test function
**
**ftp("./config/MG163_dftp.json","V7.1.155",false,(err, msg)=>{
**	if(err){
**		console.log(msg);
**	}else{
**		console.log("Create V7.1.155 directory successfully.");
**	}
**});



**sftp("./config/MG163_dsftp.json","V7.1.155",(err, msg)=>{
**	if(err){
**		console.log(msg);
**	}else{
**		console.log("Create V7.1.155 directory successfully.");
**	}
**});
***/