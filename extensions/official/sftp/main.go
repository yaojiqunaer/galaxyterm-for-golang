package main

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
)

const maxProtocolMessageSize = 16 << 20

func main() {
	encoder := json.NewEncoder(os.Stdout)
	input, err := io.ReadAll(io.LimitReader(os.Stdin, maxProtocolMessageSize+1))
	if err != nil || len(input) > maxProtocolMessageSize {
		writeResponse(encoder, protocolResponse{Error: &providerError{Code: "invalid_request", Message: "request could not be read"}})
		return
	}
	var request protocolRequest
	if err := json.Unmarshal(input, &request); err != nil {
		writeResponse(encoder, protocolResponse{Error: &providerError{Code: "invalid_request", Message: "request is not valid JSON"}})
		return
	}
	var reportProgress transferProgressReporter
	if supportsFeature(request.Features, "transfer-progress-v1") {
		reportProgress = func(bytes, total int64) {
			writeResponse(encoder, protocolProgressFrame{
				Type:      "progress",
				RequestID: request.RequestID,
				Progress:  transferProgress{Bytes: bytes, Total: total},
			})
		}
	}
	writeResponse(encoder, handleRequestWithProgress(request, reportProgress))
}

func supportsFeature(features []string, expected string) bool {
	for _, feature := range features {
		if feature == expected {
			return true
		}
	}
	return false
}

func writeResponse(encoder *json.Encoder, response any) {
	if err := encoder.Encode(response); err != nil {
		_, _ = fmt.Fprintln(os.Stderr, "failed to encode response")
	}
}
