#! /usr/bin/env ruby

require 'fileutils'

dir = ARGV[0]

unless dir
  puts "Usage: unzipper.rb [big_dir_of_ed_data]"
  exit
end

# for each subdir
Dir["#{dir}/*/*.gz"].each do |gz|
  dir = gz.split("/")[1]
  filename = File.basename(gz, '.gz')

  newfile = "json/#{dir}/#{filename}"
  FileUtils.mkdir_p("json/#{dir}")
  `gzcat #{gz} >#{newfile}`
  puts "created #{newfile}"
end
