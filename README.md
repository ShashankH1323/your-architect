# Your Architect

AI architecture assistant for students: brief to a defensible design.

- `ARCHITECT_WORKFLOW.md`: core design workflow the agent follows
- `PLATFORM_PLAN.md`: backend and UI plan
- `ui/`: front-end prototype (plain HTML/CSS/JS). File uploads are real; everything else is mock data
- `server.py`: local server for the UI that saves uploads to `uploads/<project>/`

Run the UI locally:

```bash
python server.py
```

Then open http://localhost:5173. Drop files on the home screen or anywhere in a project, or use the paperclip. Uploaded files are saved in `uploads/` (ignored by git) and listed under the project's Files tab and in the Library.
