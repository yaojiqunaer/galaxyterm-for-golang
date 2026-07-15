package main

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
)

const maxProtocolMessageSize = 16 << 20

func main() {
	input, err := io.ReadAll(io.LimitReader(os.Stdin, maxProtocolMessageSize+1))
	if err != nil || len(input) > maxProtocolMessageSize {
		writeResponse(protocolResponse{Error: &providerError{Code: "invalid_request", Message: "request could not be read"}})
		return
	}
	var request protocolRequest
	if err := json.Unmarshal(input, &request); err != nil {
		writeResponse(protocolResponse{Error: &providerError{Code: "invalid_request", Message: "request is not valid JSON"}})
		return
	}
	writeResponse(handleRequest(request))
}

func writeResponse(response protocolResponse) {
	if err := json.NewEncoder(os.Stdout).Encode(response); err != nil {
		_, _ = fmt.Fprintln(os.Stderr, "failed to encode response")
	}
}
