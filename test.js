const content =
  '```json { "title": "Refactor layout and styles", "description": "Adjusted padding and text alignment for better responsive design." } ```';

if (content.includes("```json")) {
  console.log(content.replace("```json", "").replace("```", "").trim());
}
