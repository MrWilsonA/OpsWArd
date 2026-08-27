{{- define "opsward.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "opsward.fullname" -}}
{{- if .Values.fullnameOverride }}{{ .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}{{ else }}{{ printf "%s-%s" .Release.Name (include "opsward.name" .) | trunc 63 | trimSuffix "-" }}{{ end }}
{{- end }}

{{- define "opsward.labels" -}}
app.kubernetes.io/name: {{ include "opsward.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | quote }}
{{- end }}

{{- define "opsward.selectorLabels" -}}
app.kubernetes.io/name: {{ include "opsward.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
