import { BarChart3, LineChart, PieChart, Table, X } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { VisualConfigForm } from './visual-config-form';
import type { Id } from '../../../convex/_generated/dataModel';
import type { Visual, VisualType } from '~/lib/types';
import { Button } from '~/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '~/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';

interface VisualSidebarProps {
  sheetId: Id<'sheets'>;
  datasources: Array<{ _id: Id<'datasources'>; name: string }>;
  selectedVisual: Visual | null;
  onClose: () => void;
}

const visualTypes: Array<{ type: VisualType; label: string; icon: any }> = [
  { type: 'table', label: 'Table', icon: Table },
  { type: 'bar_chart', label: 'Bar Chart', icon: BarChart3 },
  { type: 'line_chart', label: 'Line Chart', icon: LineChart },
  { type: 'pie_chart', label: 'Pie Chart', icon: PieChart },
];

export function VisualSidebar({
  sheetId,
  datasources,
  selectedVisual,
  onClose,
}: VisualSidebarProps) {
  const createVisual = useMutation(api.visuals.create);
  const updateVisual = useMutation(api.visuals.update);

  const isEditing = selectedVisual !== null;

  const handleTypeSelect = async (type: VisualType) => {
    if (selectedVisual) {
      // Update existing visual type
      await updateVisual({
        id: selectedVisual._id,
        type,
        config: { dimension: undefined, measures: [], columns: [] },
      });
    } else {
      // Create new visual with default position
      await createVisual({
        sheetId,
        datasourceId: datasources[0]?._id ?? ('' as Id<'datasources'>),
        type,
        title: `New ${type.replace('_', ' ')}`,
        position: { x: 0, y: 0, width: 4, height: 4 },
        config: { dimension: undefined, measures: [], columns: [] },
      });
    }
  };

  const handleDatasourceChange = async (datasourceId: string) => {
    if (selectedVisual) {
      await updateVisual({
        id: selectedVisual._id,
        datasourceId: datasourceId as Id<'datasources'>,
      });
    }
  };

  const currentDatasource = datasources.find(
    (d) => d._id === selectedVisual?.datasourceId,
  );

  return (
    <div className="w-80 border-r bg-card h-full flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold">
          {isEditing ? 'Edit Visual' : 'Add Visual'}
        </h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="flex items-center justify-between w-full font-medium text-sm">
            Visual Type
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="grid grid-cols-2 gap-2">
              {visualTypes.map(({ type, label, icon: Icon }) => (
                <Button
                  key={type}
                  variant={
                    selectedVisual?.type === type ? 'default' : 'outline'
                  }
                  className="h-20 flex flex-col gap-2"
                  onClick={() => handleTypeSelect(type)}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-xs">{label}</span>
                </Button>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {selectedVisual && (
          <>
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex items-center justify-between w-full font-medium text-sm">
                Data Source
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <Select
                  value={selectedVisual.datasourceId}
                  onValueChange={handleDatasourceChange}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {currentDatasource?.name ?? 'Select datasource'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {datasources.map((ds) => (
                      <SelectItem key={ds._id} value={ds._id}>
                        {ds.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex items-center justify-between w-full font-medium text-sm">
                Configuration
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <VisualConfigForm
                  visual={selectedVisual}
                  datasourceId={selectedVisual.datasourceId}
                />
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </div>
    </div>
  );
}
