# inmywords.app

## Vision and Purpose

- App purpose: a sensory-friendly, distraction-free, minimalist writing app designed for neurodivergent people who may benefit from fewer distractions and limited sensory overload with fewer features or options for customization and therefore better focus

- App Vision: a simple interface that allows users to write, organize and structure their thoughts in a smooth, clean visual interface

## Terminology

- User: the logged in and authenticated user
- Notebook: A top level prisma model that nests under it Groups, Subgroups and Entries
- Groups: A group-by model than organizes related subgroups and is nested under Notebook
- Subgroups: A group-by model that organizes related entries and is nested under Groups
- Entries: The model that represents user-generated content
- Entries may be archived instead of deleted. Archived entries are hidden by
  default but can be shown using the "Show Archived" toggle in the notebook
  controller. Archived items appear greyed out and can be restored later.
- Tags: Meta data that relate to entries and are intended to be used to provide global search functionality
- Pattern: The set of notebook aliases (Title, Description, Groups, Subgroups, Entries) that define the structure of a notebook
- Model: A notebook instance with at least one group and one subgroup, representing data shaped by a pattern
- Precursor: A pre-patterned and pre-modeled notebook template, defined by an `id`, a `pattern`, and `modelData`

## Global Styles
- font-family: "IBM Plex Mono", "Cutive Mono", monospace;
- all font weights and styles for the font should be available
- all levels of the nested models should be represented by a collapsible card element in the UI, so that clicking on a Notebook card, expands it's Groups' cards below in a list, clicking on a Group card expands it's Subgroups' cards, clicking on a Subgroups' cards expands Entries' cards, clicking on an Entry Card expands the content of that card
- all cards should transform scale and change background color onHover
- we will start with two themes that the user can select from the top NavBar component that changes background color and font color. The two themes are light/dark (white bg with black font/black bg with white font)
- border-radius value greater than zero applied to all cards, buttons and container backgrounds
- preferred to use <div> whereever possible and to rely on css classNames rather than preset h1, h2, h3 etc. 
- all transforms should have a smooth ease animation transition type look and when cards expand, the rest of the layout should move smoothly as well to make room

## User Experience and Component Breakdown

### LandingPage.jsx

- Login page where user authenticates using NextAuth.js
- Create an account option
- Minimal marketing / call to action
- TopNav with typical boiler plate Features and Pricing links

### NavBar.jsx

- Global except for when EntryEditor modal is open
- Very Simple
- - link to Dashboard in far left aligned position
- - link to profile/account manage page (dummy link as this page is not created yet)
- - logout button 
- - Theme switcher (light / dark)

### Dashboard.jsx

- After authenticating, user should be redirected to /pages/dashboard.jsx where the Dashboard.jsx component is
- Dashboard should render a list of existing Notebook Titles
- Clicking a Notebook card should route the user to pages/notebooks/[id].jsx where Notebook.jsx is rendered
- Note that on Dashboard.jsx clicking a Notebook card does not expand the tree, it should take the user directly to the Notebook
- Add Notebook button should appear on this page somewhere
- Delete icon button should appear inside every Notebook card
- Confirmation dialog should open if user clicks delete Notebook since Cascade is set in the prisma model to delete all nested relations
- Most os the app's state should live here and be passed down as props

### Notebook.jsx

- On first render, the component should load the Top Level "Groups" cards within the Notebook, collapsed as default with name or the title of the group as the text within
- Click a Groups Card to expand Subgroups' Cards
- Click a Subgroups Card to expand that Subgroups Entries
- Within each card, an edit icon and delete icon should occur for the purpose of managing Groups and Subgroups
- Button for Adding a Group at end of the list of Groups at the Group level, which will add the Group to the Notebook
- Button for Adding a Subgroup at the end of each list of Subgroups, at the level of Subgroups, which will add the Subgroup to the parent Group
- Each UserEntry card that renders in the list associated with a subgroup shows only the title of the entry along with an edit and delete icon
- Clicking the title of the Entry expands the card to show the both the title and content in read-only
- Clicking the edit icon opens the full screen modal, EntryEditor
- Clicking delete icon deletes the entry and removes the card from the screen
- A button for adding an entry appears at the end of each list of entries, at the level of entries and adding the new entry to the parent Subgroup
- Clicking to Add an Entry will immediately open the EntryEditor modal

### EntryEditor.jsx

- Full screen modal that should animate up from bottom of screen
- Text Inputs: Title, Entry Content
- Top Buttons: Save, Cancel, Delete, Add New Tag
- Top Single Select: loads tags available within the Notebook
- Clicking Save, Cancel or Delete should trigger modal to close and the related Subgroup list of Entries should re-render

### UserEntry.jsx

- the card component imported to render the title of the entry (plus action buttons) when collapsed and the title and content when expanded

### Other Components Not Fully Developed

- ThemeSelector.jsx - intended to allow for more settings in the future than simply light/dark and intended to be modular so that if we want to include it in the EntryEditor, we can, since that modal component covers the glabl NavBar

## NextJS

### API Notes
 
- For the most part, API routes have appeared to work as intended, most of the struggle has been in the UI

### Pages

- _app.js
- dashboard.jsx
- index.js
- notebooks/[id].js

### API Routes
- auth/
- - [...nextauth].js
- entries/
- - [id].js
- - index.js
- groups
- - [id].js
- - index.js
- notebooks/
- - [id].js
- - [id]/
- - - tree.js
- subgroups
- - [id].js
- - index.js
- tags
- - [id].js
- - index.js

## Development

After pulling changes that modify the Prisma schema, regenerate the client and
apply migrations:

```bash
npx prisma generate
npx prisma migrate deploy
```

### Environment Variables

Authentication requires the following environment variables to be set:

- `NEXTAUTH_SECRET`
- `DATABASE_URL`
- `GOOGLE_ID`
- `GOOGLE_SECRET`


