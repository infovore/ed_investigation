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

  client.index(index: 'ed_logs', type: 'ed_log', body: data.to_json)

  puts "Ingested #{json_file}"
end
