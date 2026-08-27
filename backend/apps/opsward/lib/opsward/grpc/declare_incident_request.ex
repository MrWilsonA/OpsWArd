defmodule OpsWard.GRPC.DeclareIncidentRequest do
  use Protobuf, full_name: "opsward.v1.DeclareIncidentRequest", syntax: :proto3

  field :title, 1, type: :string
  field :description, 2, type: :string
  field :severity, 3, type: :string
  field :actor, 4, type: :string
end
