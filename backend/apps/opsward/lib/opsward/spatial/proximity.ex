defmodule OpsWard.Spatial.Proximity do
  @max_distance 12.0

  def gain({x1, y1}, {x2, y2}, max_distance \\ @max_distance) do
    distance = :math.sqrt(:math.pow(x2 - x1, 2) + :math.pow(y2 - y1, 2))
    max(0.0, min(1.0, 1.0 - distance / max_distance))
  end

  def audible?(from, to, max_distance \\ @max_distance), do: gain(from, to, max_distance) > 0.0
end
