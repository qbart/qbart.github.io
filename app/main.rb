require 'haml'
require 'sass'
require 'sinatra'
require 'sinatra/reloader'

enable :reloader
# class Renderer
#   def self.render(file_name)
#     Haml::Engine.new(File.read(file_name)).render
#   end
# end

# module Haml::Helpers
#   def render(file_name)
#     Renderer.render(file_name)
#   end
# end

# Renderer.render('src/index.haml')


get '/' do
  haml :index
end

get '*.css' do
  scss :'../assets/application', :style => :expanded
end
