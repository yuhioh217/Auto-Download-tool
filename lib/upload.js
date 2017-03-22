const Client = require('ftp');
const fs = require('fs');
const S = require('string');
const Config = require('./configuration.js');



module.exports = {
	ftp : (conf, file) => {
		Config.ReadConfig(conf, (err, configObj) => {
			if(err){
				console.log('[upload.js] Read FTP config file failed.');
			}else{
				var c = new Client();
				var fname = (S(file).splitLeft('/'))[(S(file).splitLeft('/')).length-1];

				var ftpsite    = configObj["ftpsite"];
				var username   = configObj["username"];
				var password   = configObj["password"];
				var vport      = configObj["vport"];
				var upload_path= configObj["upload_path"];

				var options = {
					host    :   ftpsite,
					port    :   vport,
					user    :   username,
					password:   password
				};

				c.on('ready', () => {
					console.log(upload_path + '/' + fname);
					c.put(file, upload_path + '/' + fname, (err) => {
						if(err){
							console.log(err);
						}else{
							console.log("Upload file \"" + fname + "\" to FTP \"" + ftpsite + "\" path: \"" + upload_path +"\"" );
						}
						c.end();
					});
				});
				c.connect(options);	
			}
		});
	}
	
}
