defmodule OpsWard.GRPC.CommandReply do
  use Protobuf, full_name: "opsward.v1.CommandReply", syntax: :proto3

  field :id, 1, type: :string
  field :status, 2, type: :string
  field :error, 3, type: :string
end
