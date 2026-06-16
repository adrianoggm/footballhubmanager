{{/* Base name + fullname */}}
{{- define "footballhub.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "footballhub.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name (include "footballhub.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "footballhub.labels" -}}
app.kubernetes.io/name: {{ include "footballhub.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version }}
{{- end -}}

{{/* Image references */}}
{{- define "footballhub.backendImage" -}}
{{- $tag := .Values.image.tag | default .Chart.AppVersion -}}
{{- printf "%s/%s/%s:%s" .Values.image.registry .Values.image.owner .Values.backend.image.repository $tag -}}
{{- end -}}

{{- define "footballhub.frontendImage" -}}
{{- $tag := .Values.image.tag | default .Chart.AppVersion -}}
{{- printf "%s/%s/%s:%s" .Values.image.registry .Values.image.owner .Values.frontend.image.repository $tag -}}
{{- end -}}

{{/* DB host depends on the mode */}}
{{- define "footballhub.dbHost" -}}
{{- if .Values.mysql.enabled -}}
{{- printf "%s-mysql" (include "footballhub.fullname" .) -}}
{{- else -}}
{{- required "externalDatabase.host is required when mysql.enabled is false" .Values.externalDatabase.host -}}
{{- end -}}
{{- end -}}

{{/* Secret name holding DB_PASSWORD (and MYSQL_* when in-cluster) */}}
{{- define "footballhub.dbSecretName" -}}
{{- if .Values.database.existingSecret -}}
{{- .Values.database.existingSecret -}}
{{- else -}}
{{- printf "%s-db" (include "footballhub.fullname" .) -}}
{{- end -}}
{{- end -}}

{{/* DB_PASSWORD env entry (shared by backend + migrate Job) */}}
{{- define "footballhub.dbPasswordEnv" -}}
- name: DB_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ include "footballhub.dbSecretName" . }}
      key: {{ .Values.database.passwordSecretKey }}
{{- end -}}
