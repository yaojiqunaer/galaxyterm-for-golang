package main

type Settings struct {
	Connections *[]Connections `yaml:"connections"`
	Appearance  *Appearance    `yaml:"appearance"`
}

func GetSettings() Settings {
	return Settings{
		Connections: &[]Connections{
			{
				Ssh: []Connection{
					{
						Name: "test",
						Host: "localhost",
						Port: 22,
						Auth: Auth{
							AuthType: "PASSWORD",
							Username: "root",
							Password: "123456",
						},
					},
				},
			},
		},
		Appearance: &Appearance{
			Language: "en",
		},
	}
}

// Connections this is a struct that holds the connection settings
type Connections struct {
	Ssh        []Connection `yaml:"ssh"`
	Redis      []Connection `yaml:"redis"`
	MySQL      []Connection `yaml:"mysql"`
	Kubernetes []Connection `yaml:"kubernetes"`
}

type Connection struct {
	Name string `yaml:"name"`
	Host string `yaml:"host"`
	Port int    `yaml:"port"`
	Auth Auth   `yaml:"auth"`
}

type Auth struct {
	AuthType string `yaml:"type"`
	Username string `yaml:"username"`
	Password string `yaml:"password"`
}

type Appearance struct {
	Language string `yaml:"language"`
}

type AuthType string

const (
	PWD AuthType = "PASSWORD"
)
