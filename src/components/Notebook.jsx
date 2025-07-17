// Notebook.jsx
import React, { useState, memo } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Typography,
  IconButton,
  Card,
  CardContent,
  Stack,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

const INDENT_PX = 24;

/**
 * Generic row representing ANY node in the hierarchy.
 * depth: 0 = Notebook, 1 = Group, 2 = SubGroup, 3 = Entry, 4 = Tag
 */
const NodeRow = memo(function NodeRow({
  node,
  depth,
  expanded,
  toggle,
  onEdit,
  onDelete,
  hasChildren,
  children,
}) {
  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          ml: depth * INDENT_PX,
          py: 0.75,
          cursor: hasChildren ? "pointer" : "default",
          "&:hover": { bgcolor: "action.hover" },
        }}
        onClick={hasChildren ? toggle : undefined}
      >
        <Typography
          variant={depth === 0 ? "h6" : "body1"}
          sx={{ flexGrow: 1, userSelect: "none" }}
        >
          {node.title}
        </Typography>

        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(node);
          }}
        >
          <EditIcon fontSize="inherit" />
        </IconButton>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(node);
          }}
        >
          <DeleteIcon fontSize="inherit" />
        </IconButton>
      </Box>

      {/* Children (if expanded) */}
      {expanded && children}
    </>
  );
});

NodeRow.propTypes = {
  node: PropTypes.object.isRequired,
  depth: PropTypes.number.isRequired,
  expanded: PropTypes.bool,
  toggle: PropTypes.func,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  hasChildren: PropTypes.bool,
  children: PropTypes.node,
};

/**
 * Recursive renderer for the notebook tree.
 * Keeps a local expansion map keyed by node id.
 */
export default function Notebook({
  notebook,
  onEdit,
  onDelete,
  entryCardRenderer, // optional custom renderer override
}) {
  // expansionState: { [id]: boolean }
  const [expansion, setExpansion] = useState(() => {
    const initial = { [notebook.id]: true }; // Notebook starts open
    return initial;
  });

  const toggle = (id) =>
    setExpansion((prev) => ({ ...prev, [id]: !prev[id] }));

  // helpers to pull expansion value & toggle fn
  const isOpen = (id) => !!expansion[id];

  /** Renderer functions for each level **/

  const renderTags = (tags, depth) =>
    tags.map((tag) => (
      <NodeRow
        key={tag.id}
        node={tag}
        depth={depth}
        expanded={false}
        hasChildren={false}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    ));

  const renderEntries = (entries, depth) =>
    entries.map((entry) => {
      const open = isOpen(entry.id);
      return (
        <React.Fragment key={entry.id}>
          <NodeRow
            node={entry}
            depth={depth}
            expanded={open}
            toggle={() => toggle(entry.id)}
            hasChildren={true}
            onEdit={onEdit}
            onDelete={onDelete}
          />
          {open && (
            <Box ml={(depth + 1) * INDENT_PX}>
              {entryCardRenderer ? (
                entryCardRenderer(entry)
              ) : (
                <Card variant="outlined" sx={{ mb: 1 }}>
                  <CardContent>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {entry.body}
                    </Typography>
                    {/* tag rows */}
                    {renderTags(entry.tags || [], depth + 1)}
                  </CardContent>
                </Card>
              )}
            </Box>
          )}
        </React.Fragment>
      );
    });

  const renderSubGroups = (subGroups, depth) =>
    subGroups.map((sg) => {
      const open = isOpen(sg.id);
      return (
        <NodeRow
          key={sg.id}
          node={sg}
          depth={depth}
          expanded={open}
          toggle={() => toggle(sg.id)}
          hasChildren={!!sg.entries?.length}
          onEdit={onEdit}
          onDelete={onDelete}
        >
          {open && renderEntries(sg.entries || [], depth + 1)}
        </NodeRow>
      );
    });

  const renderGroups = (groups, depth) =>
    groups.map((g) => {
      const open = isOpen(g.id);
      return (
        <NodeRow
          key={g.id}
          node={g}
          depth={depth}
          expanded={open}
          toggle={() => toggle(g.id)}
          hasChildren={!!g.subGroups?.length}
          onEdit={onEdit}
          onDelete={onDelete}
        >
          {open && renderSubGroups(g.subGroups || [], depth + 1)}
        </NodeRow>
      );
    });

  /** ROOT RENDER **/
  return (
    <Stack spacing={0.5}>
      <NodeRow
        node={notebook}
        depth={0}
        expanded={isOpen(notebook.id)}
        toggle={() => toggle(notebook.id)}
        hasChildren={!!notebook.groups?.length}
        onEdit={onEdit}
        onDelete={onDelete}
      >
        {/* Notebook > Groups (always visible because notebook is expanded by default) */}
        {isOpen(notebook.id) && renderGroups(notebook.groups || [], 1)}
      </NodeRow>
    </Stack>
  );
}

/* Prop shape example (for reference only)
notebook = {
  id: 'nb‑1',
  title: 'My Notebook',
  groups: [
    {
      id: 'g‑1',
      title: 'Group A',
      subGroups: [
        {
          id: 'sg‑1',
          title: 'Sub‑group A1',
          entries: [
            {
              id: 'e‑1',
              title: 'Entry 1',
              body: 'Full text…',
              tags: [{ id: 't1', title: '#tag' }]
            }
          ]
        }
      ]
    }
  ]
}
*/
Notebook.propTypes = {
  notebook: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    groups: PropTypes.array,
  }).isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  entryCardRenderer: PropTypes.func,
};