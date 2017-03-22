'use strict';
const mkdirps = require('mkdirps');
const async = require('async');
const jsftp = require('jsftp');
const Client = require('ftp');
const fs = require('fs');
const S = require('string');
const glob = require('glob');

var count = 0;
const getDirectores = (c,dir,dl,callback) => {
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
					getDirectores(c, dir +'/' + list[i]['name'],dl,callback);
		 		}
	 		}
	 		count--;
	 		if(count === 0 && callback){
	 			callback(err,dl);
	 		}

		}
	});
};

const download = async(file, tmpdir,options,ftpsite) => {
	var c = new Client();
	var dfile = S(file).splitLeft('/')[(S(file).splitLeft('/')).length-1];  // filter the file name , ex: ./home/test_image/123.pkg
	await c.on('ready', function() {
		c.get(file, (err,stream) => {
			if(err){
				console.error(err);
				return;
			}else{
				stream.pipe(fs.createWriteStream(tmpdir + dfile));
			}
		});	
	});
	c.connect(options);
	return true;
}

module.exports = {
	help : () => {
		console.log(".ftp(\"ConfigFile\" , \"FWversion\",\"Tags\",\"TmpDir\")");
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
					var dlbool = false;
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
						password:   password
					};

					var c = new Client();
					c.on('ready', function() {
					    c.list(basic_path + tag, (err,list) => {
					    	//console.log(list);
					    	getDirectores(c, basic_path + tag,downloadlist, (err,data)=>{
					   			console.log(data);
					   			for(var j=0;j<data.length;j++){
					   				download(data[j], tmpdir, options, ftpsite);
								}
					  		});
					    });				 
					});

					c.connect(options);
				}			
			});
		});
	}
}
