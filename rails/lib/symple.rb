require "redis"
require "json"

module Symple

  def options
    @options ||= Rails.configuration.redis ||= {}
  end

  def options=(val)
    @options = val
  end

  # Redis URL
  def url=(url)
    options[:url] = url
  end

  # Publish a message to Node via Redis.
  #
  # IMPORTANT: options[:nodeId] must match the Node ID of the Node server we are
  # publishing to otherwise the message will be silently discarded.
  #
  # @channel: the group or user channel name identifier
  # @message: the message data to publish
  def broadcast(channel, message)
    #  #Socket.IO Redis subscribe: dispatch {"nodeId":672000877,"args":["/4","3:
    #  ::[object Object]",null,["13764695690716688"]]}
    #  dispatch = {
    #    'nodeId' => options[:nodeId] ||= 101, # must match node instance
    #    'args' => [
    #      '/' + channel.to_s,
    #      '4:::' + message.to_json,
    #      nil,
    #      '[]' # exceptions
    #    ]
    #  }
    redis.publish("dispatch", format(channel, message))
  end
  
  def broadcast_user(channel, message)
    redis.publish("dispatch", format("user-#{channel}", message))
  end
  
  def broadcast_group(channel, message)
    redis.publish("dispatch", format("group-#{channel}", message))
  end

  def format(channel, message) #, volatile = nil, exceptions = []
    #channel = scope + '-' + channel if channel == 'group' || channel == 'user'
    packet = "4:::#{message.is_a?(String) ? message : message.to_json}"
    # room, packet, volatile, exceptions
    # See socket.io manager.js onDispatch()
    return "{\"nodeId\":#{options[:nodeId] ||= 1},\"args\":" <<
         "[\"/#{channel}\",#{packet.to_json},null,\"[]\"]}"
         #"[\"/#{channel}\",#{packet.to_json},#{volatile},\"#{exceptions}\"]}"
  end

  def subscribe(channels)
    Redis.connect(options).subscribe(channels) do |on|
      on.message do |type, msg|
        yield(type, JSON.parse(msg))
      end
    end
  end

  protected
    def redis
      @redis ||= $redis ||= Redis.connect(options)
    end

    extend self
end