# A trivial experiment
```{dot !}
input [data="Hello, World!"];
input -> log;
```

# Specifying options
```{js !!}
exp.options.input = {data: 'Hello, World!'};
```
```{dot !}
input -> log;
```

# Specifying resources 
```{txt >>hello}
Hello, World!
```
```{dot !}
hello -> log;
```

# Accessing the result of an experiment
```{dot !!}
input [data="Hello, "];
input -> log;
```
```{js !}
stdout + 'from JS!';
```
