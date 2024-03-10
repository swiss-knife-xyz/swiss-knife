import { useRef } from "react";
import { XYCoord, useDrag, useDrop } from "react-dnd";

enum ItempType {
  FAV_EXPLORER = "FAV_EXPLORER",
}

interface DragItem {
  explorerName: string;
  index: number;
}

export const useFavExplorerDragNDrop = <T extends HTMLElement>({
  explorerName,
  index,
  handleDropHover,
}: {
  explorerName: string;
  index: number;
  handleDropHover: (i: number, j: number) => void;
}) => {
  const ref = useRef<T>(null);

  const [{ isDragging }, drag] = useDrag<
    DragItem,
    void,
    { isDragging: boolean }
  >({
    type: ItempType.FAV_EXPLORER,
    item: { explorerName, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [_, drop] = useDrop<DragItem, void, unknown>({
    accept: ItempType.FAV_EXPLORER,
    hover: (item, monitor) => {
      if (!ref.current) {
        console.log("no ref");
        return;
      }

      const draggedItemIndex = item.index;
      const hoveredItemIndex = index;

      if (draggedItemIndex === hoveredItemIndex) {
        return;
      }

      // perform the move
      handleDropHover(draggedItemIndex, hoveredItemIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoveredItemIndex;
    },
  });

  drag(drop(ref));

  return { ref, isDragging };
};
