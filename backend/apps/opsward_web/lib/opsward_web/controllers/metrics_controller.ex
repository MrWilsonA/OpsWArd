defmodule OpsWardWeb.MetricsController do
  use OpsWardWeb, :controller

  def show(conn, _params) do
    memory = :erlang.memory()
    process_count = :erlang.system_info(:process_count)
    run_queue = :erlang.statistics(:run_queue)

    body = """
    # HELP opsward_up Whether the OpsWard node is serving requests.
    # TYPE opsward_up gauge
    opsward_up 1
    # HELP opsward_erlang_process_count Number of Erlang processes.
    # TYPE opsward_erlang_process_count gauge
    opsward_erlang_process_count #{process_count}
    # HELP opsward_erlang_memory_bytes Total Erlang VM memory.
    # TYPE opsward_erlang_memory_bytes gauge
    opsward_erlang_memory_bytes #{memory[:total]}
    # HELP opsward_erlang_run_queue Scheduler run queue length.
    # TYPE opsward_erlang_run_queue gauge
    opsward_erlang_run_queue #{run_queue}
    """

    conn
    |> put_resp_content_type("text/plain; version=0.0.4")
    |> send_resp(200, body)
  end
end
