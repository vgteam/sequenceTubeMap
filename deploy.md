### Deploying the frontend for the demo on github pages

Here are the steps to deploy an update to the demo at [https://vgteam.github.io/sequenceTubeMap/](https://vgteam.github.io/sequenceTubeMap/). It updates the `gh-pages` branch of the github repo, which is the source for the demo website.

- Add the following line to `package.json`:

```
"homepage": "https://vgteam.github.io/sequenceTubeMap/"
```

- Modify the `BACKEND_URL` in `src/config.json`:

```
"BACKEND_URL": "https://api.tubemap.graphs.vg",
```

- In case you have not installed the dependencies already, run `yarn install`.
- Run `yarn run predeploy` followed by `yarn run deploy`.

In theory, the same commands should work when using `npm` instead of `yarn`, but I was told that deployment of the `gh-pages` branch fails at least with some versions of `npm` and `node`.
