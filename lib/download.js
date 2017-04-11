'use strict';
const mkdirps = require('mkdirps');
const async = require('async');
const jsftp = require('jsftp');
const Client = require('ftp');
const fs = require('fs');
const S = require('string');
const glob = require('glob');
const ssh2Client = require('ssh2-sftp-client');

var count = 0;
const getDirectoresFTP = (c,dir,dl,callback) => {
	count++;
	c.list(dir, (err,list) => {
		//console.log(list + ' size : ' + list.length);
		if(err)
			console.error('err : ' + err);
		else{
			for(var i=0; i < list.length; i++){
				if(list[i]['type'] == '-'){
					//console.log('file : ' + dir + '/' +  list[i]['name']);
					dl.push(dir + '/' + list[i]['name']);
				}
				else if(list[i]['type'] == 'd'){
					//console.log('directory : ' + list[i]['name']);
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
		//console.log('---');
		return sClient.list(dir);
	}).then((data)=>{
		for(var i=0; i< data.length ; i++){
			//console.log(data);
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

const downloadFTP = async(file, tmpdir,options, callback) => {
	var c = new Client();
	var dfile = S(file).splitLeft('/')[(S(file).splitLeft('/')).length-1];  // filter the file name , ex: ./home/test_image/123.pkg
	await c.on('ready', function() {
		c.get(file, (err,stream) => {
			if(err){
				console.error(err);
				return;
			}else{
				stream.pipe((fs.createWriteStream(tmpdir + dfile)).on('finish',()=>{

					if(callback){
						c.end();
						callback("Download file " + dfile + " complete!");
					}	
				}));
			}
		});
	});
	c.connect(options);
	return true;
}

const downloadSFTP = async(file, tmpdir, options, callback) =>{
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


	await sClient.connect(options).then(()=>{
		return sClient.get(file, rfOption);
	}).then((stream)=>{
		var output = fs.createWriteStream(tmpdir + dlf);
		stream.pipe(output.on('finish',()=>{

			if(callback){
				sClient.end();
				callback('downlaod file : ' + dlf + ' complete!');
			}
		}));
	}).catch((err)=>{
		console.log(err);
	});
	
	return true;
}

module.exports = {
	help : () => {
		console.log(".ftp(\"ConfigFile\" , \"FWversion\",\"Tags\",\"TmpDir\",\"Callback\")");
		console.log(".sftp(\"ConfigFile\" , \"FWversion\",\"Tags\",\"TmpDir\",\"Callback\")");
		console.log(".ftps(\"ConfigFile\" , \"FWversion\",\"Tags\",\"TmpDir\",\"Callback\")");
	},

	ftp : (conf, FWversion, tags, tmpdir) => {   //FTP downlaod API
		console.log(tags);
		async.eachSeries( tags, (tag, callback) => {

			var Config = require('./configuration.js');
			Config.ReadConfig(conf, (err,configObj) => {
				if(err){
					console.log('[download.js] Read FTP config file failed.');
				}else{
					var downloadlist = [];
					var dfile = '';
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
						secure  :   true
					};

					var c = new Client();
					c.on('ready', function() {
					    c.list(basic_path + tag, (err,list) => {
					    	//console.log(list);
					    	getDirectoresFTP(c, basic_path + tag,downloadlist, (err,data)=>{
					   			console.log(data);
					   			for(var j=0;j<data.length;j++){
					   				downloadFTP(data[j], tmpdir, options, (msg)=>{
					   					console.log(msg);
					   				});
								}
					  		});
					    });
					});

					c.connect(options);
				}			
			});
			callback();
		});
	},

	sftp : (conf, FWversion, tags, tmpdir) => {

		const sClient = new ssh2Client();
		console.log("Tags : " + tags);
		async.eachSeries(tags , (tag,callback)=> {
			var Config = require('./configuration.js');
			Config.ReadConfig(conf, (err,configObj) => {
					if(err){
						console.log('[download.js] Read SFTP config file failed.');
					}else{
						console.log(tag);
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

						getDirectoresSFTP(sClient, basic_path + tag, dl, options, (err, dl)=>{
							for(var i=0;i < dl.length;i++){
								console.log("[download.js] download file : \"" + dl[i] + "\" from SFTP \"" + sftpsite + "\".");
								downloadSFTP(dl[i], tmpdir, options,(msg)=>{
									console.log(msg);
								});
							}
						});
					}
			});
			callback();
		});
	},

	ftps : (conf, FWversion, tags, tmpdir, cb) => {   //FTPS downlaod API
		console.log(tags);
		async.eachSeries( tags, (tag, callback) => {

			var Config = require('./configuration.js');
			Config.ReadConfig(conf, (err,configObj) => {
				if(err){
					console.log('[download.js] Read FTP config file failed.');
				}else{
					var dlist = [];
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
							rejectUnauthorized: false
						}
					};
					console.log(options);

					var c = new Client();
					c.on('ready', function() {
					    c.list(basic_path + tag, (err,list) => {
					    	console.log(list);
					    	getDirectoresFTP(c, basic_path + tag,dlist, (err,data)=>{
					   			console.log(data);
					   			for(var j=0;j<data.length;j++){
					   				downloadFTP(data[j], tmpdir, options,(msg)=>{
					   					console.log(msg);
					   				});
								}
					  		});
					    });
					});

					c.connect(options);
				}			
			});
			callback();

			if(cb){
				cb(null,'finish');
			}
		});
	}

}


/*test function*/
//var tags = ["T7.1.6a"];
//sftp('./config/MG163_dsftp.json', 'V7.1.2', tags,'./');
