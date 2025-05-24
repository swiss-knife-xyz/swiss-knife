import { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";

enum ItemType {
  FAV_APP = "FAV_APP",
}

interface DragItem {
  appName: string;
  index: number;
}

export const useFavAppDragNDrop = <T extends HTMLElement>({
  appName,
  index,
  handleDropHover,
}: {
  appName: string;
  index: number;
  handleDropHover: (i: number, j: number) => void;
}) => {
  const ref = useRef<T>(null);

  const [{ isDragging }, drag] = useDrag<
    DragItem,
    void,
    { isDragging: boolean }
  >({
    type: ItemType.FAV_APP,
    item: { appName, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [_, drop] = useDrop<DragItem, void, unknown>({
    accept: ItemType.FAV_APP,
    hover: (item, monitor) => {
      if (!ref.current) {
        return;
      }

      const draggedItemIndex = item.index;
      const hoveredItemIndex = index;

      if (draggedItemIndex === hoveredItemIndex) {
        return;
      }

      // Perform the move
      handleDropHover(draggedItemIndex, hoveredItemIndex);

      // Update the index for the dragged item
      item.index = hoveredItemIndex;
    },
  });

  drag(drop(ref));

  return { ref, isDragging };
};
