## 0.8.4

# Background

### Patches

- Fix filter can't work with dynamic source. #25

## 0.8.3

# Background

- Reduce bundle size.
- Perf ReadAll func.

## 0.8.2

# Background

### Patches

- Fix nesting public assets can't work normal. #23

## 0.8.1

# Background

### Patches

- Fix public assets can't work with filter

## 0.8.0

# Background

### Improves & Features

- Support compress public resource. #22

## 0.7.0

# Background

### Improves & Features

- Remove hook order #20
- Remove peerDependencies

## 0.6.3

# Background

### Patches

- Fix type error (#16)

### Credits

@ModyQyW

## 0.6.2

# Background

- Fix bundle error

## 0.6.1

# Background

### Improves & Features

- Perf function type. (Details see #12)
- Add `named exports`.(Some user prefer like their project is full esm. #14)

### Credits

@MZ-Dlovely @ModyQyW

## 0.6.0

# Background

### Improves & Features

- Algorithm will using `gzip` If user pass a error union type.
- Update document usage.

## 0.5.0

# Background

### MINOR

- Migrate vite version.
- Peerdependencies support `vite3` and `vite`.

## 0.4.3

# Background

### Patches

- Fix dynamicImports loose right assets info.(Vite's intenral logic cause it. So we define the order for us plugin).

## 0.4.2

# Background

### Minor

- Perf chunk collect logic. In collect setp. Don't clone a new buffer data.
- Change release file. using `.mjs`,`.js`.

### Others

- Update project dependencies.

## 0.4.1

# Background

### Patches

- Fix dynamicImports can't generator right compressed file.

## 0.4.0

# Background

### Improves & Features

- Add `filename` prop.(Control the generator source name)
- Enhanced type inference.
- Performance optimization.
