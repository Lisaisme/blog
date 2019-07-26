// 负责创建表 及 表的操作模型
var mongoose = require('./connection');


var msgSchema = new mongoose.Schema({
    title:String,
    tag:Array,
    msg: String,
    time: String,    
    author: String,
    reples: [ 
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'reply'
        }
    ],
    count:Number
    
});

var Message = mongoose.model('msg', msgSchema)


module.exports = Message;
