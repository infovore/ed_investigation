#! /usr/bin/env ruby

require 'elasticsearch'
require 'json'
require 'hashie'

client = Elasticsearch::Client.new(
  hosts: ['http://localhost:9200']
)

Dir["json/*/*.json"].each do |json_file|
  data = Hashie::Mash.new(JSON.parse(File.read(json_file)))

  # tidy up formatting
  if data.lastStarport.modules
    data.lastStarport.modules = data.lastStarport.modules.map {|k,v| v}
  end

  if data.lastStarport.ships
    data.lastStarport.ships = data.lastStarport.ships.map {|k,v| v}
  end

  data.timestamp = Time.at(data.timestamp).to_datetime.iso8601

  if data.lastStarport.commodities
    puts "Indexing commodities from #{json_file}"
    data.lastStarport.commodities.each do |c|
      row = {starport: data.lastStarport.name,
             timestamp: data.timestamp}
      %w{baseConsumptionQty baseCreationQty basicStock buyPrice capacity categoryname consumebuy consumptionQty cost_max cost_mean cost_min creationQty demand demandBracket homebuy homesell id market_id meanPrice name parent_id rare_min_stock rare_max_stock sellPrice statusFlags stock stockBracket targetStock volumescale}.each do |key|
        row[key.to_sym] = c.send key
      end
      client.index(index: 'ed_commodities', type: 'ed_commodity', body: row.to_json)
      print "."
    end
    print "\n"
  end

  client.index(index: 'ed_logs', type: 'ed_log', body: data.to_json)

  puts "Ingested #{json_file}"
end
