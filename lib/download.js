'use strict';
const mkdirps = require('mkdirps');
const async = require('async');
const jsftp = require('jsftp');
const Client = require('ftp');
const fs = require('fs');
const S = require('string');
const glob = require('glob');
const ssh2Client = require('ssh2-sftp-client');
const reconnect = require('reconnect');

var count = 0;
const getDirectoresFTP = (c,dir,dl,callback) => {
	count++;
	c.list(dir, (err,list) => {
		if(err)
			console.error('err : ' + err);
		else{
			for(var i=0; i < list.length; i++){
				if(list[i]['type'] == '-'){
					dl.push(dir + '/' + list[i]['name']);
				}
				else if(list[i]['type'] == 'd'){
					getDirectoresFTP(c, dir +'/' + list[i]['name'],dl,callback);
		 		}
	 		}
	 		count--;
	 		if(count === 0 && callback){
	 			count = 0;
	 			callback(err,dl);
	 		}

		}
	});
};

const getDirectoresSFTP = (sClient, dir, dl, options,callback) => {
	count++;
	sClient.connect(options).then(()=>{
		return sClient.list(dir);
	}).then((data)=>{
		for(var i=0; i< data.length ; i++){
			if(data[i]['type'] == '-')
				dl.push(dir + '/' + data[i]['name'])
			else if(data[i]['type'] == 'd')
				getDirectoresSFTP(sClient, dir + '/' + data[i]['name'], dl, options, callback);

		}
		count--;

		if(count === 0 && callback){
			count = 0;
			sClient.end();
			callback('',dl);
		}
	}).catch((err)=>{
		console.log(err)
	});
}

///////////////////////////////////////////////////////////////
////////////////////* download FTP*///////////////////////////

const downloadFTP = (file, tmpdir,options, callback) => {
	var c = new Client();
	var dfile = S(file).splitLeft('/')[(S(file).splitLeft('/')).length-1];  // filter the file name , ex: ./home/test_image/123.pkg
	c.on('ready', function() {
		c.get(file, (err,stream) => {
			if(err){
				console.error(err);
				if(callback){
					c.end();
					callback(err,"");
				}	
			}else{
				stream.pipe((fs.createWriteStream(tmpdir + dfile)).on('finish',()=>{

					if(callback){
						c.end();
						callback("","Download file " + dfile + " complete!");
					}	
				}));
			}
		});
	});
	c.connect(options);
	return true;
}

const taskFTP_promise = (file, tmpdir, options) => {

	return new Promise(function(resolve,reject){

		downloadFTP(file, tmpdir,options,(err,data)=>{
			if(err){
				reject(err);
			}
			resolve(data);
		});
	});
}

///////////////////////////////////////////////////////////////
////////////////////* download SFTP*///////////////////////////

const downloadSFTP = (file, tmpdir, options, callback) =>{
	var dlf = '';
	var sClient = new ssh2Client();
	var rfOption = {
						flags: 'r',
						encoding: null,
						fd: null,
						mode: 0o666,
						autoClose: true
					}
	dlf = S(file).splitLeft('/')[(S(file).splitLeft('/')).length-1];


	sClient.connect(options).then(()=>{
		return sClient.get(file, rfOption);
	}).then((stream)=>{
		var output = fs.createWriteStream(tmpdir + dlf);
		stream.pipe(output.on('finish',()=>{

			if(callback){
				sClient.end();
				callback('','downlaod file : ' + dlf + ' complete!');
			}
		}));
	}).catch((err)=>{
		console.log(err);

		if(callback){
			sClient.end();
			callback(err,'');
		}
	});
	
	return true;
}


const taskSFTP_promise = (file, tmpdir, options) => {

	return new Promise((resolve,reject)=>{
		downloadSFTP(file, tmpdir, options, (err,data) => {
			if(err){
				reject(err);
			}
			resolve(data);
		});
	});
}

////////////////////////////////////////////////////////////////////////////////////////////
const ftp_download = (conf, FWversion, tags, tmpdir, cb) => {
	const sClient = new ssh2Client();
	console.log("Tags : " + tags);
	async.eachSeries(tags , (tag,callback)=> {
		var Config = require('./configuration.js');
		Config.ReadConfig(conf, (err,configObj) => {
				if(err){
					console.log('[download.js] Read SFTP config file failed.');
					if(cb){
						cb(err,'Read config file failed.');
					}
				}else{
					console.log(tag);
					var fnum = 0;
					var dl = [];
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

					var a = "";
					getDirectoresSFTP(sClient, basic_path + tag, dl, options, async(err, data)=>{
						for(var i = 0;i < data.length;i++){
							console.log("[download.js] download file : \"" + data[i] + "\" from SFTP \"" + sftpsite + "\".");
							a = await taskSFTP_promise(data[i],tmpdir, options);
							console.log(a);
						}

						if(cb){
							return cb("", data);
						}
					});
				}
		});
		callback();
		
	});
}


const ftps_download = (conf, FWversion, tags, tmpdir, cb) => {   //FTPS downlaod API
	console.log(tags);
	async.eachSeries( tags, (tag, callback) => {
		var c = new Client();
		var Config = require('./configuration.js');
		Config.ReadConfig(conf, (err,configObj) => {
			if(err){
				console.log('[download.js] Read FTP config file failed.');
			}else{
				var dlist = [];
				var fnum = 0;
				var dfile      = '';
				var useSSL     = true;
				var ftpsite    = configObj["ftpsite"];
				var username   = configObj["username"];
				var password   = configObj["password"];
				var vport      = configObj["vport"];
				var basic_path = configObj["basic_path"];

				var options = {
					host    :   ftpsite,
					port    :   vport,
					user    :   username,
					password:   password,
					secure  :   true,
					pasvTimeout: 20000,
						keepalive: 20000,
					secureOptions : {
						rejectUnauthorized:false
					}
				};

				var a = "";
               

				
				c.on('ready', function() {
				    c.list(basic_path + tag, (err,list) => {
				    	//console.log(list);
				    	getDirectoresFTP(c, basic_path + tag,dlist, async(err,data)=>{
				    			c.end();								
				    			//var dataT = ['/WISTRON_MTK_VIA/V7.1.4/MG163/V7.1.4.utv'] 
							for(var j=0;j<data.length;j++){

								console.log("download file :" + data[j] + " from FTPS : " + ftpsite);
								a = await taskFTP_promise(data[j], tmpdir, options);		
								console.log(a);
				   				
							}
							if(cb){
								return cb("", data);
							}

				  		});
				    });
				});

				c.connect(options);
			}			
		});
		callback();
	});
}

const sftp_download = (conf, FWversion, tags, tmpdir, cb) => {

	const sClient = new ssh2Client();
	console.log("Tags : " + tags);
	async.eachSeries(tags , (tag,callback)=> {
		var Config = require('./configuration.js');
		Config.ReadConfig(conf, (err,configObj) => {
				if(err){
					console.log('[download.js] Read SFTP config file failed.');
					if(cb){
						cb(err,'Read config file failed.');
					}
				}else{
					console.log(tag);
					var fnum = 0;
					var dl = [];
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

					var a = "";
					getDirectoresSFTP(sClient, basic_path + tag, dl, options, async(err, data)=>{
						for(var i = 0;i < data.length;i++){
							console.log("[download.js] download file : \"" + data[i] + "\" from SFTP \"" + sftpsite + "\".");
							a = await taskSFTP_promise(data[i],tmpdir, options);
							console.log(a);
						}

						if(cb){
							return cb("", data);
						}
					});
				}
		});
		callback();
		
	});
}

const ftp_download_promise = (conf, FWversion, tags, tmpdir) => {
	return new Promise((resolve,reject) => {
		ftp_download(conf, FWversion, tags, tmpdir, (err,data)=>{
			if(err){
				reject(err);
			}
			resolve(data);
		});
	});
}

const ftps_download_promise = (conf, FWversion, tags, tmpdir) => {
	return new Promise((resolve,reject) => {
		ftps_download(conf, FWversion, tags, tmpdir, (err,data)=>{
			if(err){
				reject(err);
			}
			resolve(data);
		});
	});
}

const sftp_download_promise = (conf, FWversion, tags, tmpdir) => {
	return new Promise((resolve,reject) => {
		sftp_download(conf, FWversion, tags, tmpdir, (err,data)=>{
			if(err){
				reject(err);
			}
			resolve(data);
		});
	});
}



/***********module*************/

module.exports = {
	help : () => {
		console.log(".ftp(\"ConfigFile\" , \"FWversion\",\"Tags\",\"TmpDir\",\"Callback\")");
		console.log(".sftp(\"ConfigFile\" , \"FWversion\",\"Tags\",\"TmpDir\",\"Callback\")");
		console.log(".ftps(\"ConfigFile\" , \"FWversion\",\"Tags\",\"TmpDir\",\"Callback\")");
	},

	ftp : async (conf, FWversion, tags, tmpdir) => {
		var data = await ftp_download_promise(conf, FWversion, tags, tmpdir);
		return data;
	},

	sftp : async (conf, FWversion, tags, tmpdir) => {
		var data = await sftp_download_promise(conf, FWversion, tags, tmpdir);
		return data;
	},

	ftps : async (conf, FWversion, tags, tmpdir) => {   //FTPS downlaod API
		var data = await ftps_download_promise(conf, FWversion, tags, tmpdir);
		return data;
	}

}
