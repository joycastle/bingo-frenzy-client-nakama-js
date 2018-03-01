// Copyright 2018 The Nakama Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
	"os"
	"strings"
	"text/template"
)

const codeTemplate string = `// tslint:disable
/* Code generated by openapi-gen/main.go. DO NOT EDIT. */

const BASE_PATH = "http://127.0.0.1:80";

export interface ConfigurationParameters {
  basePath?: string;
  username?: string;
  password?: string;
  bearerToken?: string;
}

{{- range $classname, $definition := .Definitions}}
/** {{$definition.Description}} */
export interface {{$classname | title}} {
  {{- range $fieldname, $property := $definition.Properties}}
  {{- $camelcase := $fieldname | camelCase}}
  // {{$property.Description}}
  {{- if eq $property.Type "integer"}}
  {{$camelcase}}?: number;
  {{- else if eq $property.Type "boolean"}}
  {{$camelcase}}?: boolean;
  {{- else if eq $property.Type "array"}}
    {{- if eq $property.Items.Type "string"}}
  {{$camelcase}}?: Array<string>;
    {{- else if eq $property.Items.Type "integer"}}
  {{$camelcase}}?: Array<number>;
    {{- else if eq $property.Items.Type "boolean"}}
  {{$camelcase}}?: Array<boolean>;
    {{- else}}
  {{$camelcase}}?: Array<{{$property.Items.Ref | cleanRef}}>;
    {{- end}}
  {{- else if eq $property.Type "string"}}
  {{$camelcase}}?: string;
  {{- else}}
  {{$camelcase}}?: {{$property.Ref | cleanRef}};
  {{- end}}
  {{- end}}
}
{{- end}}

export const NakamaApi = (configuration: ConfigurationParameters = {
  basePath: BASE_PATH,
  bearerToken: "",
  password: "",
  username: "",
}) => {
  return {
  {{- range $url, $path := .Paths}}
    {{- range $method, $operation := $path}}
    /** {{$operation.Summary}} */
    {{$operation.OperationId | camelCase}}(
    {{- range $parameter := $operation.Parameters}}
    {{- $camelcase := $parameter.Name | camelCase}}
    {{- if eq $parameter.In "path"}}
    {{- $camelcase}}{{- if not $parameter.Required }}?{{- end}}: {{$parameter.Type}},
    {{- else if eq $parameter.In "body"}}
      {{- if eq $parameter.Schema.Type "string"}}
    {{- $camelcase}}{{- if not $parameter.Required }}?{{- end}}: {{$parameter.Schema.Type}},
      {{- else}}
    {{- $camelcase}}{{- if not $parameter.Required }}?{{- end}}: {{$parameter.Schema.Ref | cleanRef}},
      {{- end}}
    {{- else if eq $parameter.Type "array"}}
    {{- $camelcase}}{{- if not $parameter.Required }}?{{- end}}: Array<{{$parameter.Items.Type}}>,
    {{- else}}
    {{- $camelcase}}{{- if not $parameter.Required }}?{{- end}}: {{$parameter.Type}},
    {{- end}}
    {{- " "}}
    {{- end}}options: any = {}): Promise<{{$operation.Responses.Ok.Schema.Ref | cleanRef}}> {
      {{- range $parameter := $operation.Parameters}}
      {{- $camelcase := $parameter.Name | camelCase}}
      {{- if $parameter.Required }}
      if ({{$camelcase}} === null || {{$camelcase}} === undefined) {
        throw new Error("'{{$camelcase}}' is a required parameter but is null or undefined.");
      }
      {{- end}}
      {{- end}}
      const urlPath = "{{- $url}}"
      {{- range $parameter := $operation.Parameters}}
      {{- $camelcase := $parameter.Name | camelCase}}
      {{- if eq $parameter.In "path"}}
         .replace("{{- print "{" $parameter.Name "}"}}", encodeURIComponent(String({{- $camelcase}})))
      {{- end}}
      {{- end}};

      const queryParams = {
      {{- range $parameter := $operation.Parameters}}
      {{- $camelcase := $parameter.Name | camelCase}}
      {{- if eq $parameter.In "query"}}
        {{$parameter.Name}}: {{$camelcase}},
      {{- end}}
      {{- end}}
      } as any;
      const urlQuery = "?" + Object.keys(queryParams)
      	.map(k => encodeURIComponent(k) + "=" + encodeURIComponent(queryParams[k]))
      	.join("&");

      const fetchOptions = {...{ method: "{{- $method | uppercase}}" }, ...options};
      const authorization = (configuration.bearerToken)
          ? "Bearer " + configuration.bearerToken
          : "Basic " + btoa(configuration.username + ":" + configuration.password);
      const headers = {
        "Accept": "application/json",
        "Authorization": authorization,
        "Content-Type": "application/json",
      } as any;
      fetchOptions.headers = {...headers, ...options.headers};

      {{- range $parameter := $operation.Parameters}}
      {{- $camelcase := $parameter.Name | camelCase}}
      {{- if eq $parameter.In "body"}}
      fetchOptions.body = JSON.stringify({{$camelcase}} || {});
      {{- end}}
      {{- end}}

      return fetch(configuration.basePath + urlPath + urlQuery, fetchOptions).then((response) => {
        if (response.status >= 200 && response.status < 300) {
          return response.json();
        } else {
          throw response;
        }
      });
    },
    {{- end}}
  {{- end}}
  };
};
`

func snakeCaseToCamelCase(input string) (camelCase string) {
	isToUpper := false
	for k, v := range input {
		if k == 0 {
			camelCase = strings.ToLower(string(input[0]))
		} else {
			if isToUpper {
				camelCase += strings.ToUpper(string(v))
				isToUpper = false
			} else {
				if v == '_' {
					isToUpper = true
				} else {
					camelCase += string(v)
				}
			}
		}

	}
	return
}

func convertRefToClassName(input string) (className string) {
	cleanRef := strings.TrimLeft(input, "#/definitions/")
	className = strings.Title(cleanRef)
	return
}

func main() {
	// Argument flags
	var output = flag.String("output", "", "The output for generated code.")
	flag.Parse()

	inputs := flag.Args()
	if len(inputs) < 1 {
		fmt.Printf("No input file found: %s\n", inputs)
		flag.PrintDefaults()
		return
	}

	fmap := template.FuncMap{
		"camelCase": snakeCaseToCamelCase,
		"cleanRef":  convertRefToClassName,
		"title":     strings.Title,
		"uppercase": strings.ToUpper,
	}

	input := inputs[0]
	content, err := ioutil.ReadFile(input)
	if err != nil {
		fmt.Printf("Unable to read file: %s\n", err)
		return
	}

	var schema struct {
		Paths map[string]map[string]struct {
			Summary     string
			OperationId string
			Responses   struct {
				Ok struct {
					Schema struct {
						Ref string `json:"$ref"`
					}
				} `json:"200"`
			}
			Parameters []struct {
				Name     string
				In       string
				Required bool
				Type     string   // used with primitives
				Items    struct { // used with type "array"
					Type string
				}
				Schema struct { // used with http body
					Type string
					Ref  string `json:"$ref"`
				}
			}
		}
		Definitions map[string]struct {
			Properties map[string]struct {
				Type  string
				Ref   string   `json:"$ref"` // used with object
				Items struct { // used with type "array"
					Type string
					Ref  string `json:"$ref"`
				}
				Format      string // used with type "boolean"
				Description string
			}
			Description string
		}
	}

	if err := json.Unmarshal(content, &schema); err != nil {
		fmt.Printf("Unable to decode input %s : %s\n", input, err)
		return
	}

	tmpl, err := template.New(input).Funcs(fmap).Parse(codeTemplate)
	if err != nil {
		fmt.Printf("Template parse error: %s\n", err)
		return
	}

	if len(*output) < 1 {
		tmpl.Execute(os.Stdout, schema)
		return
	}

	f, err := os.Create(*output)
	if err != nil {
		fmt.Printf("Unable to create file %s", err)
		return
	}
	defer f.Close()

	writer := bufio.NewWriter(f)
	tmpl.Execute(writer, schema)
	writer.Flush()
}
