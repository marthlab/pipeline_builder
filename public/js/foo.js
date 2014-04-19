client.on('open', function(stream) {
    var stream = client.createStream(
        {event: 'run', params: {'url':app.pipeline.wsurl}});
    stream.on('data', function(data, options) {
        console.log(JSON.parse(data))});
})


var client = new BinaryClient();
// Received new stream from server!
client.on('stream', function(stream, meta){
    // Buffer for parts
    var parts = [];
    // Got new data
    stream.on('data', function(data){
        parts.push(data);
    });
    stream.on('end', function(){
        // Display new data in browser!
        img.src = (window.URL || window.webkitURL).createObjectURL(new Blob(parts));
        document.body.appendChild(img);
    });
});


