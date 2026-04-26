import SharePageForm from "./SharePageForm";

// Using the Next.js 15+ promise-based params approach
type Props = {
  params: Promise<{ uuid: string }>;
};

export default async function WidgetPage({ params }: Props) {
  const { uuid } = await params;

  return (
    <div style={{ padding: '2rem 1rem', minHeight: '100vh', display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-base)' }}>
      <SharePageForm uuid={uuid} />
    </div>
  );
}
