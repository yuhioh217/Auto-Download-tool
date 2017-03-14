const fs = require('fs');
const S = require('string');

module.exports = {
	WriteConfig : (file,data,eStr,callback) => {   //update config from object data.
		fs.writeFile(file, JSON.stringify(data),(err)=>{
			if(err){
				console.error(err);
				return;
			}else{
				console.log(eStr);
				if(callback){
					callback(null,true);
				}
			}
		});
	}


	ReadConfig : (file,callback) => {
		var configObj = '';
		fs.readFile(file,'utf-8',(err,data)=>{
			configObj = JSON.parse(data);
			if(callback){
				callback(null,configObj);
			}
		});
	}

	SetConfig : (file,keyStr,value,callback) => {   //update config from the key word field
		var strArr = S(keyStr).splitLeft('.');
		var num = strArr.length;
		var exeStr = 'configObj';

		GetConfig(file,keyStr,function(err,data){
			if(err){
				console.log('[Configuration.js][Error] Check your keyword again, Thanks!');
			}else{
				//continue to do
				ReadConfig(file,function(err,configObj){
					if(err){
						console.log('[Configuration.js][Error] read config error.');
						return;
					}else{
						//parse and set the configObj value
						for(var i = 0 ; i < num ; i++){
							 exeStr = exeStr + '.' +  strArr[i];
						}
						exeStr = exeStr + '=\'' + value + '\'';
						eval(exeStr);
						//console.log(configObj);
						WriteConfig(file,configObj,'[Configuration.js] Set the value to config file successfully.',function(err,bool){
							if(err){
								console.log('[Configuration.js] Set the value failed, please check the config file/key value');
							}else{
								if(callback){
									callback(null,configObj);
								}
							}
						});
					}
				});
			}
		});
	}

	GetConfig : (file,keyStr,callback) =>{   //get the config data from the key field
		var strArr = S(keyStr).splitLeft('.');
		var num = strArr.length;

		ReadConfig(file,function(err,data){
			if(data!=null){
				var configObj = data;
				var findString = '';
				//check field.
				for(var i = 0 ; i < num ; i++){
					if(configObj[strArr[i]] instanceof Object){
						configObj = configObj[strArr[i]];
					}else{
						findString = configObj[strArr[i]];
					}
					
					if(configObj == null || findString == null){
						console.log('[Configuration.js][Error] key word error, please try and check your search key');
						return;
					}
				}

				if(callback){
					callback('', findString);
				}
				
			}else{
				if(callback){
					callback('[Configuration.js][Error] config file ' + file + ' can\'t read normally','');
				}
			}
		});	
	}
}

