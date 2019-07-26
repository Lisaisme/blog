var mongoose = require('./connection');

var replySchema = new mongoose.Schema({
    msg:String,
    time:String,
    username:String
});

var Reply = mongoose.model('reply',replySchema);

module.exports = Reply;