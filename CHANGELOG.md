## 1.3.2

Support Vite6

## 1.3.1

Using `jiek`

## 1.3.0

# Improves

- `tarball` support generate gz archive.

# Patches

- Fix vite@2 can't work.

## 1.2.0

- Support work with plugins that specify hook order.

## 1.1.4

- Migrate to `tar-mini`

## 1.1.3

# Improves

- Option `include` add more defaults.

# Patches

- Fix overload error.

### Credits

@mengdaoshizhongxinyang @silverwind

## 1.1.2

# Improve

- Remove `tar-stream`.

## 1.1.1

# Patches

- Tarball should handle right static sources.

## 1.1.0

# Improve

- Option `include` add default value.

### Credits

@Ibadichan

## 1.0.0

# Background

This is a stable version.

### Major

- Rename plugin `cp` as `tarball` and remove unnecessary options.

### Improves

- Optimize compression task.

## 0.12.0

# Background

### Improves

- expose new plugin `cp`.(a tarball helper)

## 0.11.0

# Background

- Details see #41

## 0.10.6

# Background

### Improves

- Perf types.
- Reduce unnecessary installation packages.

## 0.10.5

# Background

### Improves

- Reduce bundle size.

### Patches

- Fix can't work at monorepo.

## 0.10.4

# Background

- Make options happy

## 0.10.3

# Background

### Patches

- Fix output option duplicate. #39

## 0.10.2

# Background

### Patches

- Fix option `filename` called result same as bundle filename can't work. #31

## 0.10.1

# Background

### Patches

- Fix chunk with side effect can't work with `threshold` #33

## 0.10.0

# Background

### Improve & Features

- Add `skipIfLargerOrEqual` option. #32

### Credits

@vHeemstra @nonzzz

## 0.9.3

# Background

### Improve

- Static Directory support size check.

## 0.9.2

# Background

### Patches

- Fix `filename` same as bundle source name can't work. #30

### Credits

@jglee96 @nonzzz

## 0.9.1

# Background

### Improve

- Reduce unnecessary io (Currently, We don't handle viteMetaData.Becasue vite has already process them)
- Add queue to optimize task processing.

### Patches

- Fix that the file with side effect can't be filterd.
- Static assets can't handle correctly.

## 0.9.0

# Background

- Support multiple process. #27

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
