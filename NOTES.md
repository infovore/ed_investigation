# Elite Dangerous stats - notes

First, I set up a local elasticsearch instance. I just used Homebrew - `brew install elasticsearch`.

I wrote some code to unpack Nick's data files - `unzipper.rb` - and ran that. This gives me all his JSON. There's a lot!

I created an index in elasticsearch using httpie and `./create_index.sh` - note that this preconfigures the mapping based on `mapping.json` (just to map a few fields correctly as strings, not ints).

Then, I slurped all that code into elasticsearch. I used `es_loader.rb` to do this. It performs some quick/dirty manual transformations of the data to make it suit elasticsearch a little better.

The net result is a big index called `es_logs`. Now I could start writing queries.

---

The simplest data-over-time query is just a histogram aggregation. This will spit out document counts per minute:

	{
	  "aggs": {
	    "docs_over_time": {
	      "date_histogram": {
	        "field": "timestamp",
	        "interval": "minute"
	      },
	    }
	  }
	}


If we want to aggregate a particular field, we can nest an aggregation in our histogram to extract it:

	{
	  "aggs": {
	    "docs_over_time": {
	      "date_histogram": {
	        "field": "timestamp",
	        "interval": "hour"
	      },
	      "aggs": {
	        "commodity_stats": {
	          "stats": {
	            "field": "commander.credits"
	          }
	        }
	      }
	    }
	  }
	}

although that will only tell us how many buckets of each unique value of credits exist in that timeslot. So if the timeslot is "minute", there will be a single bucket - but if it's "hour", there might be a few buckets, and we don't have an easy way of ordering them.

A better solution is to take *stats* over time - and thus find the average number of credits per hour. For instance:

Cred stats over time:
	
	{
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
	}
	
This query can be found as `creds_over_time_query.json` and it returns the data found in `creds_over_time.json`.

---

Exploring Commodity Stats over time
-----------------------------------

First, get all unique stations:

	 {
	   "aggs": {
	     "docs_per_station" : {
	       "terms" : {
	         "field" : "lastStarport.name"
	       }
	     }
	   }
	 }

If you want to see all documents for a particular station, so you can extract all the commodities there:

	{
		"query": {
	        "term": {
	          "lastStarport.name": req.params.station
	        }
	      }
	}

But really, what we're interested in is data over time.

Now we can make a histogram over time for commodites at Lave:

	 {
	   "query": {
	     "term": {"lastStarport.name": "Lave Station"}
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
	 }

And then if we want to graph one of those, the extraction function in our D3 is:

	 var data = _.map(resp.aggregations.docs_over_time.buckets, function(bucket) {
	   var x = bucket.key / 1000; // milliseconds innit
	   var biowaste = _.find(bucket.commodities.buckets, function (buck) {
	     return buck.key == 'Biowaste';
	   });
	
	   var y = biowaste.price_stats.avg;
	   return {x:x, y:y};
	 });