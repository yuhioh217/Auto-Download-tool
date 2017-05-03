var glob = require("glob");

module.exports = {

	getList : (dir , cb) => {
		glob(dir + "**/**/**/**/**/**/**/*", (err,file)=>{
			if(err){
				console.log(err);
				if(cb){
					return cb(err,"");
				}
			}
			console.log(file);
			if(cb){
				return cb(" ", file);
			}
		});
	}

}

