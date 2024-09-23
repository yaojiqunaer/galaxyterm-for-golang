package main

import (
	"context"
	"fmt"
)

type Person struct {
	Name   string     `json:"name"`
	Age    int        `json:"age"`
	Edu    *Education `json:"edu"`
	Parent *Person    `json:"parent"`
	Mother *Person    `json:"mother"`
}

func (p *Person) ToString(person *Person) string {
	var parentName, motherName, edu string
	if person.Parent != nil {
		parentName = person.Parent.Name
	}
	if person.Mother != nil {
		motherName = person.Mother.Name
	}
	if person.Edu != nil {
		edu = person.Edu.Degree + " at " + person.Edu.School
	}
	return fmt.Sprintf("Name: %s, Age: %d, Education: %s, Parent: %s, Mother: %s", person.Name, person.Age, edu, parentName, motherName)
}

type Education struct {
	School string `json:"school"`
	Degree string `json:"degree"`
}

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// Greet returns a greeting for the given name
func (a *App) Greet(person Person) string {
	return fmt.Sprintf(person.ToString(&person))
}
