const glob = require("glob");
const fs   = require("fs");

const filefilter = (arr, cb) => {
	var fileArray = [];
	for(var i = 0; i < arr.length ; i++){
		if((fs.lstatSync(arr[i])).isFile()){
			fileArray.push(arr[i]);
		}		

	}

	if(cb){
		return cb("", fileArray);
	}
}


module.exports = {

	getList : (dir , cb) => {
		glob(dir + "**/**/**/**/**/**/**/*", (err,file)=>{
			if(err){
				console.log(err);
				if(cb){
					return cb(err,"");
				}
			}
			filefilter(file, (err,list) => {
				if(err){
					console.log("err");
					return -1;
				}

				if(cb){
					return cb("", list);
				}
			});
		});
	},
}

