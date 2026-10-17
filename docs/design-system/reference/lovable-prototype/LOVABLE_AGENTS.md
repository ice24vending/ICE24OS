<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Keep prototype data in shared fixtures and React memory; never add external persistence to this visual prototype.
- Use a shared ICE24 shell/provider around leaf routes so role, context and demo states remain consistent.
- Define visual primitives in src/styles.css and reuse them on every screen and the design-system gallery.
