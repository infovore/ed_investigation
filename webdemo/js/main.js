var client = new elasticsearch.Client();

client.search({
  index: 'ed_logs',
  size: 5,
  body: {
    // Begin query.
    "aggs": {
      "docs_over_time": {
        "date_histogram": {
          "field": "timestamp",
          "interval": "hour"
        },
        "aggs": {
          "creds": {
            "stats": {
              "field": "commander.credits"
            }
          }
        }
      }
    }
    // End query.
  }
}).then(function (resp) {
  console.log(resp);

  // transform resp into something that fits what rickshaw needs - x and y.

  var data = _.map(resp.aggregations.docs_over_time.buckets, function(bucket) {
    var x = bucket.key / 1000; // milliseconds innit
    var y = bucket.creds.avg;
    return {x:x, y:y};
  });

  // D3 code goes here.
  console.log(data);

  var graph = new Rickshaw.Graph( {
    element: document.querySelector("#chart"),
    renderer: 'line',
    width: 540,
    height: 240,
    series: [ {
      data: data,
      color: 'steelblue'
    } ]
  } );

  var x_axis = new Rickshaw.Graph.Axis.Time( { graph: graph } );

  var y_axis = new Rickshaw.Graph.Axis.Y( {
    graph: graph,
    orientation: 'left',
    tickFormat: Rickshaw.Fixtures.Number.formatKMBT,
    element: document.getElementById('y_axis'),
  } );

  graph.render();

  var hoverDetail = new Rickshaw.Graph.HoverDetail( {
	graph: graph,
	formatter: function(series, x, y) {
		var date = '<span class="date">' + new Date(x * 1000).toUTCString() + '</span>';
		var swatch = '<span class="detail_swatch" style="background-color: ' + series.color + '"></span>';
		var content = swatch + 'Credits' + ": " + parseInt(y) + '<br>' + date;
		return content;
	}
} );
});

