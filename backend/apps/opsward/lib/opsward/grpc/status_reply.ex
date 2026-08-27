defmodule OpsWard.GRPC.StatusReply do
  use Protobuf, full_name: "opsward.v1.StatusReply", syntax: :proto3

  field :json, 1, type: :string
end
