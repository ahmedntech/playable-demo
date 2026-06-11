import { useEditor } from '../store';
import { RuntimeMount } from '../components/RuntimeMount';

export function Preview() {
  const config = useEditor((s) => s.config);
  const previewKey = useEditor((s) => s.previewKey);

  return (
    <div className="phone">
      <div className="phone-screen">
        <RuntimeMount
          config={config}
          remountKey={previewKey}
          onCta={(url) => alert('CTA tapped → would open: ' + url)}
        />
      </div>
    </div>
  );
}
