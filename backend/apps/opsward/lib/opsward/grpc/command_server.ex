defmodule OpsWard.GRPC.CommandServer do
  use GRPC.Server, service: OpsWard.GRPC.CommandService

  def declare_incident(request, materializer) do
    request
    |> GRPC.Stream.unary(materializer: materializer)
    |> GRPC.Stream.map(&declare/1)
    |> GRPC.Stream.run()
  end

  def consensus_status(request, materializer) do
    request
    |> GRPC.Stream.unary(materializer: materializer)
    |> GRPC.Stream.map(fn _ ->
      %OpsWard.GRPC.StatusReply{json: Jason.encode!(OpsWard.Consensus.status())}
    end)
    |> GRPC.Stream.run()
  end

  defp declare(request) do
    attrs = %{
      "title" => request.title,
      "description" => request.description,
      "severity" => request.severity
    }

    case OpsWard.Incidents.create_incident(attrs, request.actor) do
      {:ok, incident} ->
        %OpsWard.GRPC.CommandReply{id: incident.id, status: Atom.to_string(incident.status)}

      {:error, reason} ->
        %OpsWard.GRPC.CommandReply{status: "error", error: inspect(reason)}
    end
  end
end
