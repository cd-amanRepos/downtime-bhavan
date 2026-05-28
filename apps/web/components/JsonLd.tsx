/**
 * Server component that serializes one or more schema.org JSON-LD objects
 * into a single `<script type="application/ld+json">` tag.
 *
 * Server-rendered (not via `next/script`) because Google has stated that
 * server-rendered JSON-LD is preferred — no risk of client hydration delay
 * affecting indexing.
 *
 * The `<` → `<` replacement prevents the JSON payload from terminating
 * the surrounding `</script>` tag if any string field contains the substring
 * `</script>`. This is the standard XSS-hardening dance for inline JSON.
 */

export function JsonLd({ data }: { data: object | object[] }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
