var express = require('express'),
    exphbs = require('express-handlebars'),
    fs = require('fs'),
    elasticsearch = require('elasticsearch'),
    _ = require('underscore');

var app = express(), handlebars;

var esClient = new elasticsearch.Client();


// Create `ExpressHandlebars` instance with a default layout.
handlebars = exphbs.create({
    defaultLayout: 'main',
    extname      : '.html', //set extension to .html so handlebars knows what to look for
    helpers: {
      json: function(obj) { return JSON.stringify(obj)}
    }
});

// Register `hbs` as our view engine using its bound `engine()` function.
// Set html in app.engine and app.set so express knows what extension to look for.
app.engine('html', handlebars.engine);
app.set('view engine', 'html');
// use /public for static files
app.use(express.static(__dirname + '/public'));

// port should either be 5000 or set in environment variables
app.set('port', (process.env.PORT || 5000))

var http = require('http').Server(app);

app.get('/', function(req, res){
  esClient.search({
    index: 'ed_logs',
    size: 5,
    body: {
      // Begin query.
      "aggs": {
        "docs_per_station" : {
          "terms" : {
            "field" : "lastStarport.name"
          }
        }
      }
      // End query.
    }
  }).then(function(resp) {
    var stations = _.map(resp.aggregations.docs_per_station.buckets, function(bucket) {
      return bucket.key
    });
    console.log(stations);
    res.render('index', {stations: stations});
  });
});

app.get('/stations/:station', function(req,res) {
  esClient.search({
    index: 'ed_logs',
    //size: 5,
    body: {
      // Begin query.
      "filter": {
        "term": {"lastStarport.name": req.params.station}
      }
    // End query.
    }
  }).then(function(resp) {
    var docs = _.map(resp.hits.hits, function(hit) {
      return hit._source;
    });

    //console.log("%j", docs);
    
    var allCommodities = _.map(docs, function(doc) {
      var commodityNames = _.map(doc.lastStarport.commodities, function (c) {
        return c.name;
      });
      return commodityNames;
    });

    console.log(allCommodities);

    allCommodities = _.uniq(_.flatten(allCommodities)).sort();
    
    res.render('station', {station: req.params.station,
                           commodities: allCommodities});
  });
});

app.get('/stations/:station/commodities/:commodity', function(req,res) {
  esClient.search({
    index: 'ed_logs',
    //size: 5,
    body: {
      // Begin query.
      "query": {
        "term": {"lastStarport.name": req.params.station}
      },
      "aggs": {
        "docs_over_time": {
          "date_histogram": {
            "field": "timestamp",
            "interval": "hour"
          },
          "aggs": {
            "commodities": {
              "terms": {
                "field": "lastStarport.commodities.name"
              },
              "aggs": {
                "price_stats": {
                  "stats": {
                    "field": "lastStarport.commodities.sellPrice"    
                  }
                }
              }
            }
          }
        }
      }
    // End query.
    }
  }).then(function(resp) {
    var data = _.map(resp.aggregations.docs_over_time.buckets, function(bucket) {
      var x = bucket.key / 1000; // milliseconds innit

      var commodity = _.find(bucket.commodities.buckets, function (buck) {
        return buck.key == unescape(req.params.commodity);
      });

      var y = commodity.price_stats.avg;
      return {x:x, y:y};
    });

    var dataString = JSON.stringify(data);

    res.render('commodity', {station: req.params.station,
                             commodity: req.params.commodity,
                             data: data});
  });
});


// finally, spin the app up
http.listen(app.get('port'), function(){
  console.log('listening on *:' + app.get('port'));
});
